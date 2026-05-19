import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
  type Node,
  type Edge,
  type EdgeProps,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,

} from 'reactflow';
import 'reactflow/dist/style.css';
import { useMembers, useSelfProfile } from '../db/hooks';
import type { Member } from '../types';

// ===== 相性計算（内訳・論拠つき） =====
interface CompatResult {
  totalScore: number;       // 0〜100
  complementaryScore: number; // 0〜100
  breakdown: { label: string; score: number; max: number; reason: string }[];
  label: string;
  color: string;
}

function calcCompatibility(a: Member, b: Member): CompatResult {
  const breakdown: { label: string; score: number; max: number; reason: string }[] = [];

  const aEnn = a.enneagram?.type || a.aiInferred?.enneagram?.type || a.aiInferred?.inferred_enneagram_main;
  const bEnn = b.enneagram?.type || b.aiInferred?.enneagram?.type || b.aiInferred?.inferred_enneagram_main;
  const aMbti = (a.mbti?.type || a.aiInferred?.mbti?.type || a.aiInferred?.inferred_mbti || '').toUpperCase();
  const bMbti = (b.mbti?.type || b.aiInferred?.mbti?.type || b.aiInferred?.inferred_mbti || '').toUpperCase();
  const aScores = a.enneagram?.scores || (a.aiInferred?.inferred_enneagram_scores
    ? Object.fromEntries(Object.entries(a.aiInferred.inferred_enneagram_scores).map(([k,v]) => [k, v])) : null);
  const bScores = b.enneagram?.scores || (b.aiInferred?.inferred_enneagram_scores
    ? Object.fromEntries(Object.entries(b.aiInferred.inferred_enneagram_scores).map(([k,v]) => [k, v])) : null);

  let totalRaw = 0;
  let complementaryRaw = 0;
  let maxPossible = 0;

  // ① エニアグラム（最大40点）
  if (aEnn && bEnn && !a.enneagram?.unknown && !b.enneagram?.unknown) {
    maxPossible += 40;
    if (aScores && bScores) {
      let dot = 0, normA = 0, normB = 0;
      for (let t = 1; t <= 9; t++) {
        const av = (aScores as Record<string, number>)[String(t)] ?? 0;
        const bv = (bScores as Record<string, number>)[String(t)] ?? 0;
        dot += av * bv; normA += av * av; normB += bv * bv;
      }
      const sim = normA > 0 && normB > 0 ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
      const pts = Math.round(sim * 40);
      totalRaw += pts;
      if (sim < 0.3) complementaryRaw += 20;
      breakdown.push({
        label: 'エニアグラム類似度',
        score: pts,
        max: 40,
        reason: sim > 0.7
          ? `タイプ${aEnn}とタイプ${bEnn}のスコア分布が非常に近く、価値観・動機が似ている`
          : sim > 0.4
          ? `タイプ${aEnn}とタイプ${bEnn}は部分的に重なる傾向がある`
          : `タイプ${aEnn}とタイプ${bEnn}は異なる動機を持ち、補完関係になりやすい`,
      });
    } else {
      const diff = Math.min(Math.abs(aEnn - bEnn), 9 - Math.abs(aEnn - bEnn));
      let pts = 0;
      let reason = '';
      if (diff <= 1) { pts = 36; reason = `タイプ${aEnn}とタイプ${bEnn}は隣接タイプで、価値観・世界観が近い`; }
      else if (diff === 4 || diff === 5) {
        pts = 12; complementaryRaw += 20;
        reason = `タイプ${aEnn}とタイプ${bEnn}は対角に位置し、互いの弱点を補い合う補完関係`;
      }
      else { pts = 20; reason = `タイプ${aEnn}とタイプ${bEnn}は中程度の類似性がある`; }
      totalRaw += pts;
      breakdown.push({ label: 'エニアグラム', score: pts, max: 40, reason });
    }
  }

  // ② MBTI（最大35点）
  if (aMbti && bMbti && aMbti.length === 4 && bMbti.length === 4 && !a.mbti?.unknown && !b.mbti?.unknown) {
    maxPossible += 35;
    let matches = 0, diffs = 0;
    const dims = ['E/I', 'N/S', 'T/F', 'J/P'];
    const matchedDims: string[] = [], diffedDims: string[] = [];
    for (let i = 0; i < 4; i++) {
      if (aMbti[i] === bMbti[i]) { matches++; matchedDims.push(dims[i]); }
      else { diffs++; diffedDims.push(dims[i]); }
    }
    let pts = 0, compPts = 0, reason = '';
    if (matches >= 3) {
      pts = 32;
      reason = `${aMbti}と${bMbti}は${matchedDims.join('・')}が一致。思考・行動パターンが非常に近い`;
    } else if (matches === 2) {
      pts = 18;
      reason = `${aMbti}と${bMbti}は${matchedDims.join('・')}が一致、${diffedDims.join('・')}が異なる`;
    } else if (diffs >= 3) {
      pts = 10; compPts = 15;
      reason = `${aMbti}と${bMbti}は${diffedDims.join('・')}が異なり、補完関係になりやすい`;
    } else {
      pts = 14;
      reason = `${aMbti}と${bMbti}は中程度の類似性（${matchedDims.join('・')}一致）`;
    }
    totalRaw += pts;
    complementaryRaw += compPts;
    breakdown.push({ label: 'MBTI', score: pts, max: 35, reason });
  }

  // ③ モチベーション（最大15点）
  if (a.motivation && b.motivation) {
    maxPossible += 15;
    const pts = a.motivation === b.motivation ? 15 : 5;
    totalRaw += pts;
    breakdown.push({
      label: 'モチベーション',
      score: pts,
      max: 15,
      reason: a.motivation === b.motivation
        ? `ともに「${a.motivation}」を動機とし、目指す方向が一致している`
        : `「${a.motivation}」と「${b.motivation}」で動機が異なるが、刺激し合える可能性がある`,
    });
  }

  // ④ 意思決定スタイル（最大10点）
  if (a.decisionStyle && b.decisionStyle) {
    maxPossible += 10;
    const same = a.decisionStyle === b.decisionStyle;
    const pts = same ? 10 : 4;
    if (!same) complementaryRaw += 5;
    totalRaw += pts;
    breakdown.push({
      label: '意思決定スタイル',
      score: pts,
      max: 10,
      reason: same
        ? `ともに「${a.decisionStyle}」で意思決定のテンポが合いやすい`
        : `「${a.decisionStyle}」と「${b.decisionStyle}」で補完的。慎重さと決断力のバランスが取れる`,
    });
  }

  if (maxPossible === 0) {
    const hasFreeText = !!(a.freeText || b.freeText);
    const hasAnyInfo = !!(aEnn || bEnn || aMbti || bMbti);
    return {
      totalScore: -1,
      complementaryScore: 0,
      breakdown: [],
      label: hasFreeText || hasAnyInfo ? '分析待ち' : '情報不足',
      color: hasFreeText || hasAnyInfo ? '#a78bfa' : '#d1d5db',
    };
  }

  const totalScore = Math.round((totalRaw / maxPossible) * 100);
  const complementaryScore = Math.round(Math.min(complementaryRaw / maxPossible * 100, 100));

  // ラベルと色
  let label = '中立';
  let color = '#d1d5db';
  if (complementaryScore > 50 && totalScore < 50) {
    label = '補完関係'; color = '#3b82f6';
  } else if (totalScore >= 75) {
    label = '相性◎'; color = '#22c55e';
  } else if (totalScore >= 55) {
    label = '相性○'; color = '#86efac';
  } else if (totalScore < 35) {
    label = '相性△'; color = '#ef4444';
  }

  return { totalScore, complementaryScore, breakdown, label, color };
}

// ===== カスタムエッジ（ツールチップつき） =====


function CompatEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  data, markerEnd, style,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const compat: CompatResult = data?.compat;
  if (!compat) return null;

  const scoreLabel = compat.totalScore >= 0 ? `${compat.totalScore}点` : compat.label;
  const color = compat.color;

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            zIndex: 10,
          }}
          className="nodrag nopan"
          onMouseEnter={(_e) => {
            const el = document.getElementById(`tooltip-${id}`);
            if (el) { el.style.display = 'block'; el.style.left = `${labelX}px`; el.style.top = `${labelY + 20}px`; }
          }}
          onMouseLeave={(_e) => {
            const el = document.getElementById(`tooltip-${id}`);
            if (el) el.style.display = 'none';
          }}
        >
          <div style={{
            background: color,
            color: 'white',
            fontSize: 11,
            fontWeight: 'bold',
            padding: '2px 8px',
            borderRadius: 12,
            whiteSpace: 'nowrap',
            cursor: 'default',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}>
            {scoreLabel}
          </div>
        </div>

        {/* ツールチップ */}
        <div
          id={`tooltip-${id}`}
          style={{
            display: 'none',
            position: 'absolute',
            transform: `translate(-50%, 0) translate(${labelX}px,${labelY + 24}px)`,
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          <div style={{
            background: 'white',
            border: `1.5px solid ${color}`,
            borderRadius: 10,
            padding: '10px 14px',
            minWidth: 220,
            maxWidth: 300,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            fontSize: 12,
          }}>
            <div style={{ fontWeight: 'bold', color, marginBottom: 6, fontSize: 13 }}>
              {data?.aName} × {data?.bName}
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 14, color: '#111' }}>
              {compat.totalScore >= 0 ? `総合スコア: ${compat.totalScore}点 / 100点` : compat.label}
            </div>
            {compat.breakdown.map((b, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: '#555' }}>{b.label}</span>
                  <span style={{ fontWeight: 'bold', color }}>{b.score}/{b.max}点</span>
                </div>
                <div style={{ background: '#f0f0f0', borderRadius: 4, height: 4, overflow: 'hidden', marginBottom: 2 }}>
                  <div style={{ width: `${(b.score / b.max) * 100}%`, height: '100%', background: color, borderRadius: 4 }} />
                </div>
                <div style={{ color: '#777', fontSize: 11 }}>{b.reason}</div>
              </div>
            ))}
            {compat.complementaryScore > 40 && (
              <div style={{ marginTop: 6, padding: '4px 8px', background: '#eff6ff', borderRadius: 6, color: '#1d4ed8', fontSize: 11 }}>
                補完スコア: {compat.complementaryScore}点 — 互いの弱点を補い合える関係
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = { compatEdge: CompatEdge };

// ===== メイン =====
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

    // self as pseudo-member for compat calc
    const selfAsMember: Partial<Member> = selfProfile ? {
      enneagram: selfProfile.enneagram,
      mbti: selfProfile.mbti,
      bigfive: selfProfile.bigfive,
      motivation: undefined,
      decisionStyle: undefined,
    } : {};

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

    const memberCompats = members.map(m => calcCompatibility(m, selfAsMember as Member));

    members.forEach((member, i) => {
      const compat = memberCompats[i];
      // 距離計算
      let radius = baseRadius;
      if (compat.totalScore >= 0) {
        if (compat.totalScore >= 70) radius = baseRadius * 0.65;
        else if (compat.complementaryScore > 50) radius = baseRadius * 0.85;
        else if (compat.totalScore < 35) radius = baseRadius * 1.2;
      }

      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle) - 50;
      const y = centerY + radius * Math.sin(angle) - 30;
      const mbtiType = member.aiInferred?.mbti?.type || member.mbti?.type;

      nodes.push({
        id: member.id,
        data: {
          label: (
            <div className="text-center cursor-pointer" onClick={() => navigate(`/members/${member.id}`)}>
              <div className="font-bold text-gray-800">{member.name}</div>
              {mbtiType && <div className="text-xs text-gray-500">{mbtiType}</div>}
              <div className="text-xs mt-0.5 font-medium" style={{ color: compat.color }}>
                {compat.totalScore >= 0 ? `${compat.totalScore}点` : compat.label}
              </div>
            </div>
          ),
        },
        position: { x, y },
        style: {
          background: 'white', border: `2px solid ${compat.color}`,
          borderRadius: 12, width: 100, padding: '6px 4px',
        },
      });

      edges.push({
        id: `self-${member.id}`,
        source: 'self',
        target: member.id,
        type: 'compatEdge',
        style: { stroke: compat.color, strokeWidth: compat.totalScore >= 70 ? 3 : 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: compat.color },
        data: { compat, aName: '自分', bName: member.name },
      });
    });

    // メンバー間エッジ
    if (showMemberEdges) {
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const compat = calcCompatibility(members[i], members[j]);
          if (compat.label === '情報不足') continue;
          edges.push({
            id: `member-${members[i].id}-${members[j].id}`,
            source: members[i].id,
            target: members[j].id,
            type: 'compatEdge',
            style: { stroke: compat.color, strokeWidth: 1.5, strokeDasharray: '4 3' },
            data: { compat, aName: members[i].name, bName: members[j].name },
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
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-gray-900">関係性ネットワーク</h1>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={showMemberEdges} onChange={e => setShowMemberEdges(e.target.checked)} className="accent-indigo-600" />
          メンバー間の関係線を表示
        </label>
      </div>

      {/* 凡例 */}
      <div className="flex gap-4 mb-2 text-xs flex-wrap">
        {[
          { color: '#22c55e', label: '相性◎（75点〜）' },
          { color: '#86efac', label: '相性○（55〜74点）' },
          { color: '#3b82f6', label: '補完関係' },
          { color: '#ef4444', label: '相性△（〜34点）' },
          { color: '#a78bfa', label: '分析待ち' },
        ].map(item => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className="inline-block rounded" style={{ background: item.color, width: 14, height: 3 }} />
            <span className="text-gray-600">{item.label}</span>
          </span>
        ))}
      </div>
      <p className="text-xs text-gray-400 mb-2">エッジの点数にマウスオーバーすると内訳と論拠を表示</p>

      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ minHeight: 500 }}>
        <ReactFlow
          nodes={nodes} edges={edges}
          edgeTypes={edgeTypes}
          fitView attributionPosition="bottom-right"
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}
