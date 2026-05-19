import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
  type Node,
  type Edge,
  Background,
  Controls,
  MiniMap,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useMembers, useSelfProfile } from '../db/hooks';
import type { Member } from '../types';

// 相性スコア算出（-1〜1）
function calcCompatibility(a: Member, b: Member): { score: number; complementary: number; label: string } {
  let score = 0;
  let complementary = 0;
  let factors = 0;

  // aiInferred を優先してフォールバック
  const aEnn = a.enneagram?.type || a.aiInferred?.enneagram?.type;
  const bEnn = b.enneagram?.type || b.aiInferred?.enneagram?.type;
  const aMbti = (a.mbti?.type || a.aiInferred?.mbti?.type || '').toUpperCase();
  const bMbti = (b.mbti?.type || b.aiInferred?.mbti?.type || '').toUpperCase();

  // エニアグラムベースの相性
  if (aEnn && bEnn && !a.enneagram?.unknown && !b.enneagram?.unknown) {
    const diff = Math.min(Math.abs(aEnn - bEnn), 9 - Math.abs(aEnn - bEnn));
    if (diff <= 1) score += 0.6;
    else if (diff === 4 || diff === 5) { complementary += 0.7; score -= 0.2; }
    else score += 0.2;
    factors++;
  }

  // MBTIベースの相性
  if (aMbti && bMbti && aMbti.length === 4 && bMbti.length === 4 && !a.mbti?.unknown && !b.mbti?.unknown) {
    let matches = 0;
    let diffs = 0;
    for (let i = 0; i < 4; i++) {
      if (aMbti[i] === bMbti[i]) matches++;
      else diffs++;
    }
    if (matches >= 3) score += 0.5;
    else if (matches === 2) score += 0.1;
    else if (diffs >= 3) complementary += 0.5;
    factors++;
  }

  // モチベーション
  if (a.motivation && b.motivation) {
    if (a.motivation === b.motivation) score += 0.3;
    factors++;
  }

  // 意思決定スタイル
  if (a.decisionStyle && b.decisionStyle) {
    if (a.decisionStyle === b.decisionStyle) score += 0.2;
    else complementary += 0.3;
    factors++;
  }

  // 関係性・役割からの補完推定
  if (a.relationship && b.relationship) {
    const dominant = ['上司', 'リーダー', 'マネージャー'];
    const aIsDominant = dominant.includes(a.role ?? '') || dominant.includes(a.relationship ?? '');
    const bIsDominant = dominant.includes(b.role ?? '') || dominant.includes(b.relationship ?? '');
    if (aIsDominant !== bIsDominant) { complementary += 0.2; factors++; }
  }

  // フリーテキストのみ（AI分析前）でもノードを表示する
  // factorsが0でもfreeTextがあれば「分析待ち」として中立で表示
  if (factors === 0) {
    const hasFreeText = !!(a.freeText || b.freeText);
    const hasAnyInfo = !!(aEnn || bEnn || aMbti || bMbti);
    if (hasFreeText || hasAnyInfo) {
      return { score: 0, complementary: 0, label: '分析待ち' };
    }
    return { score: 0, complementary: 0, label: '情報不足' };
  }

  score = score / Math.max(factors * 0.5, 1);
  complementary = complementary / Math.max(factors * 0.5, 1);

  // ラベル決定
  let label = '中立';
  if (complementary > 0.5 && score < 0.3) label = '補完関係';
  else if (score > 0.5) label = '相性◎';
  else if (score > 0.2) label = '相性○';
  else if (score < -0.1) label = '相性△';

  return {
    score: Math.max(-1, Math.min(1, score)),
    complementary: Math.max(0, Math.min(1, complementary)),
    label,
  };
}

// selfとメンバーの距離算出（相性が良いほど近く、補完は中距離）
function calcDistance(score: number, complementary: number, baseRadius: number): number {
  if (score > 0.4) return baseRadius * 0.65; // 相性良：近い
  if (complementary > 0.5) return baseRadius * 0.85; // 補完：中距離
  if (score < -0.1) return baseRadius * 1.2; // 相性悪：遠い
  return baseRadius; // 中立：標準
}

// エッジカラー
function edgeColor(compat: { score: number; complementary: number; label: string }): string {
  if (compat.label === '相性◎') return '#22c55e';
  if (compat.label === '相性○') return '#86efac';
  if (compat.label === '補完関係') return '#3b82f6';
  if (compat.label === '相性△') return '#ef4444';
  if (compat.label === '分析待ち') return '#a78bfa'; // 紫：AI分析を促す
  return '#d1d5db';
}

export default function Network() {
  const members = useMembers();
  const selfProfile = useSelfProfile();
  const navigate = useNavigate();
  const [showMemberEdges, setShowMemberEdges] = useState(true);

  const { nodes, edges } = useMemo(() => {
    if (!members || members.length === 0) return { nodes: [], edges: [] };

    const centerX = 400;
    const centerY = 300;
    const baseRadius = 220;
    const count = members.length;

    // selfノード
    const nodes: Node[] = [
      {
        id: 'self',
        data: {
          label: (
            <div className="text-center">
              <div className="font-bold text-indigo-700">自分</div>
              {selfProfile && <div className="text-xs text-indigo-500">{selfProfile.mbti.unknown ? '?' : selfProfile.mbti.type}</div>}
            </div>
          ),
        },
        position: { x: centerX - 40, y: centerY - 30 },
        style: {
          background: '#eef2ff', border: '2px solid #6366f1', borderRadius: '50%',
          width: 80, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
        },
      },
    ];
    const edges: Edge[] = [];

    // selfとメンバー間のedgeと位置計算
    const memberCompatWithSelf = members.map(member => {
      // selfをMemberライクに変換
      const selfAsMember: Partial<Member> = selfProfile ? {
        enneagram: selfProfile.enneagram,
        mbti: selfProfile.mbti,
        bigfive: selfProfile.bigfive,
        motivation: undefined,
        decisionStyle: undefined,
      } : {};
      return calcCompatibility(member, selfAsMember as Member);
    });

    members.forEach((member, i) => {
      const compat = memberCompatWithSelf[i];
      const radius = calcDistance(compat.score, compat.complementary, baseRadius);
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle) - 50;
      const y = centerY + radius * Math.sin(angle) - 30;
      const mbtiType = member.aiInferred?.mbti?.type || member.mbti?.type;
      const color = edgeColor(compat);

      nodes.push({
        id: member.id,
        data: {
          label: (
            <div className="text-center cursor-pointer" onClick={() => navigate(`/members/${member.id}`)}>
              <div className="font-bold text-gray-800">{member.name}</div>
              {mbtiType && <div className="text-xs text-gray-500">{mbtiType}</div>}
              <div className="text-xs mt-0.5 font-medium" style={{ color }}>{compat.label}</div>
            </div>
          ),
        },
        position: { x, y },
        style: {
          background: 'white',
          border: `2px solid ${color}`,
          borderRadius: 12, width: 100, padding: '6px 4px',
        },
      });

      // self↔メンバー のエッジ
      edges.push({
        id: `self-${member.id}`,
        source: 'self',
        target: member.id,
        style: { stroke: color, strokeWidth: compat.score > 0.4 ? 3 : 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color },
        label: compat.label,
        labelStyle: { fontSize: 9, fill: color, fontWeight: 'bold' },
      });
    });

    // メンバー間のエッジ（showMemberEdgesがtrueの時のみ）
    if (showMemberEdges) {
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const compat = calcCompatibility(members[i], members[j]);
          if (compat.label === '情報不足' || compat.label === '中立') continue;
          const color = edgeColor(compat);
          edges.push({
            id: `member-${members[i].id}-${members[j].id}`,
            source: members[i].id,
            target: members[j].id,
            style: { stroke: color, strokeWidth: 1.5, strokeDasharray: '4 3' },
            label: compat.label,
            labelStyle: { fontSize: 8, fill: color },
          });
        }
      }
    }

    return { nodes, edges };
  }, [members, selfProfile, navigate, showMemberEdges]);

  if (!members || members.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-4xl mb-3">🕸️</p>
          <p className="text-gray-500">メンバーを追加するとネットワーク図が表示されます</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">関係性ネットワーク</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={showMemberEdges} onChange={e => setShowMemberEdges(e.target.checked)} className="accent-indigo-600" />
            メンバー間の関係線を表示
          </label>
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex gap-4 mb-3 text-xs flex-wrap">
        {[
          { color: '#22c55e', label: '相性◎（似た考え方）' },
          { color: '#86efac', label: '相性○' },
          { color: '#3b82f6', label: '補完関係（互いを活かし合える）' },
          { color: '#ef4444', label: '相性△（摩擦が生じやすい）' },
          { color: '#a78bfa', label: '分析待ち（AI分析で確定）' },
        ].map(item => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 inline-block rounded" style={{ background: item.color, height: 3 }} />
            <span className="text-gray-600">{item.label}</span>
          </span>
        ))}
      </div>
      <p className="text-xs text-gray-400 mb-2">
        実線：自分↔メンバー / 破線：メンバー間 / ノードの距離：自分との相性（近いほど似た志向性）
      </p>

      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ minHeight: 500 }}>
        <ReactFlow nodes={nodes} edges={edges} fitView attributionPosition="bottom-right">
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}
