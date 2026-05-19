import { useMemo, useState, useRef } from 'react';
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

// ===== 相性計算（詳細論拠つき） =====
interface BreakdownItem {
  label: string;
  score: number;
  max: number;
  reason: string;
  detail: string; // 詳細説明
}

interface CompatResult {
  totalScore: number;
  complementaryScore: number;
  breakdown: BreakdownItem[];
  label: string;
  color: string;
  summary: string; // 総評
}

function mbtiDimLabel(dim: number): string {
  return ['E/I（外向・内向）', 'N/S（直感・感覚）', 'T/F（思考・感情）', 'J/P（判断・知覚）'][dim];
}

function enneagramDesc(type: number): string {
  const descs: Record<number, string> = {
    1: '完璧主義・改革者', 2: '援助者・奉仕型', 3: '達成者・成功志向',
    4: '個人主義・感性型', 5: '調査者・知識欲旺盛', 6: '忠実者・安全志向',
    7: '熱狂者・楽観型', 8: '挑戦者・自己主張強', 9: '平和主義者・調和型',
  };
  return descs[type] ?? `タイプ${type}`;
}

function motivationDesc(m: string): string {
  const map: Record<string, string> = {
    '成長': '自己成長・スキルアップ',
    '安定': '安心・継続性',
    '貢献': 'チームや社会への貢献',
    '認められること': '承認・評価',
    '自律性': '自由・主体性',
  };
  return map[m] ?? m;
}

function decisionDesc(d: string): string {
  const map: Record<string, string> = {
    '直感型': '素早く決断・行動重視',
    '熟考型': '慎重に検討・情報収集を好む',
    '合議型': '合意形成・チームで決める',
  };
  return map[d] ?? d;
}

function buildSummary(totalScore: number, complementaryScore: number, breakdown: BreakdownItem[]): string {
  if (totalScore < 0) return '';
  const highItems = breakdown.filter(b => b.score / b.max >= 0.75).map(b => b.label);
  const lowItems = breakdown.filter(b => b.score / b.max < 0.4).map(b => b.label);
  const isComp = complementaryScore > 50 && totalScore < 60;

  if (isComp) {
    return `表面的な違いは大きいが、互いの弱点を補い合える「補完型」の関係。${highItems.length > 0 ? `${highItems.join('・')}に共通点がある。` : ''}意識的に協力すれば相乗効果が生まれやすい。`;
  }
  if (totalScore >= 75) {
    return `価値観・思考スタイルが非常に近い。${highItems.join('・')}が一致しており、自然と息が合いやすい関係。ただし似すぎているため、互いの盲点を指摘し合えない場合もある。`;
  }
  if (totalScore >= 55) {
    return `基本的な部分で共通点があり、協力しやすい関係。${highItems.length > 0 ? `特に${highItems.join('・')}が近い。` : ''}${lowItems.length > 0 ? `${lowItems.join('・')}の違いには意識的な配慮が必要。` : ''}`;
  }
  if (totalScore < 35) {
    return `考え方・動き方に大きな違いがある。${lowItems.length > 0 ? `${lowItems.join('・')}にギャップがあり、` : ''}誤解が生じやすい。お互いの違いを「間違い」ではなく「スタイルの差」として受け入れることが重要。`;
  }
  return `中程度の相性。共通点と相違点が混在しており、関係の質はコミュニケーションの取り方次第。`;
}

function calcCompatibility(a: Member, b: Member): CompatResult {
  const breakdown: BreakdownItem[] = [];

  const aEnn = a.enneagram?.type || a.aiInferred?.enneagram?.type || a.aiInferred?.inferred_enneagram_main;
  const bEnn = b.enneagram?.type || b.aiInferred?.enneagram?.type || b.aiInferred?.inferred_enneagram_main;
  const aMbti = (a.mbti?.type || a.aiInferred?.mbti?.type || a.aiInferred?.inferred_mbti || '').toUpperCase();
  const bMbti = (b.mbti?.type || b.aiInferred?.mbti?.type || b.aiInferred?.inferred_mbti || '').toUpperCase();
  const aScores = a.enneagram?.scores || (a.aiInferred?.inferred_enneagram_scores
    ? Object.fromEntries(Object.entries(a.aiInferred.inferred_enneagram_scores).map(([k,v]) => [k, v])) : null);
  const bScores = b.enneagram?.scores || (b.aiInferred?.inferred_enneagram_scores
    ? Object.fromEntries(Object.entries(b.aiInferred.inferred_enneagram_scores).map(([k,v]) => [k, v])) : null);

  let totalRaw = 0, complementaryRaw = 0, maxPossible = 0;

  // ① エニアグラム（最大40点）
  if (aEnn && bEnn && !a.enneagram?.unknown && !b.enneagram?.unknown) {
    maxPossible += 40;
    const aDesc = enneagramDesc(aEnn);
    const bDesc = enneagramDesc(bEnn);
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
        score: pts, max: 40,
        reason: sim > 0.7
          ? `${aDesc}と${bDesc}の価値観・動機が非常に近い`
          : sim > 0.4
          ? `${aDesc}と${bDesc}は部分的に重なる傾向がある`
          : `${aDesc}と${bDesc}は異なる動機を持ち、補完関係になりやすい`,
        detail: sim > 0.7
          ? `両者ともスコア分布が似通っており、物事への向き合い方・反応パターンが自然と一致しやすい。会話のテンポや優先順位が合いやすく、摩擦が起きにくい。`
          : sim > 0.4
          ? `一部の動機は共有しているが、重視するポイントに差がある。互いの「なぜそれが大事か」を丁寧に説明し合うことで理解が深まる。`
          : `根本的な動機・世界観が異なる。片方が「当然」と思うことが、もう片方には理解しにくいことがある。それぞれの視点を持ち寄ることで、チームとして多角的な判断ができる。`,
      });
    } else {
      const diff = Math.min(Math.abs(aEnn - bEnn), 9 - Math.abs(aEnn - bEnn));
      let pts = 0, reason = '', detail = '';
      if (diff <= 1) {
        pts = 36;
        reason = `タイプ${aEnn}（${aDesc}）とタイプ${bEnn}（${bDesc}）は隣接タイプ`;
        detail = `隣接タイプは世界観・価値観が非常に近く、自然と意気投合しやすい。ただしどちらも似たような「盲点」を持つため、重要な判断をする際は異なる視点の人を交えることが望ましい。`;
      } else if (diff === 4 || diff === 5) {
        pts = 12; complementaryRaw += 20;
        reason = `タイプ${aEnn}（${aDesc}）とタイプ${bEnn}（${bDesc}）は対角に位置する補完関係`;
        detail = `対角のタイプは互いに持っていない強みを持ち合っている。表面上は「合わない」と感じることもあるが、それぞれの強みを活かせる役割分担ができれば非常に強いチームになる。コミュニケーションには意識的な努力が必要。`;
      } else {
        pts = 20;
        reason = `タイプ${aEnn}（${aDesc}）とタイプ${bEnn}（${bDesc}）は中程度の類似性`;
        detail = `全く異なるわけでも同じでもない。特定のシチュエーションでは息が合い、別の場面では違和感を覚えることがある。お互いの反応パターンを知っておくと、すれ違いを減らせる。`;
      }
      totalRaw += pts;
      breakdown.push({ label: 'エニアグラム', score: pts, max: 40, reason, detail });
    }
  }

  // ② MBTI（最大35点）
  if (aMbti && bMbti && aMbti.length === 4 && bMbti.length === 4 && !a.mbti?.unknown && !b.mbti?.unknown) {
    maxPossible += 35;
    const dims = [0, 1, 2, 3];
    const matchedDims = dims.filter(i => aMbti[i] === bMbti[i]);
    const diffedDims = dims.filter(i => aMbti[i] !== bMbti[i]);
    const matches = matchedDims.length, diffs = diffedDims.length;

    const matchLabels = matchedDims.map(i => mbtiDimLabel(i));
    const diffLabels = diffedDims.map(i => mbtiDimLabel(i));

    let pts = 0, compPts = 0, reason = '', detail = '';
    if (matches >= 3) {
      pts = 32;
      reason = `${aMbti}と${bMbti}は${matchLabels.join('・')}が一致`;
      detail = `思考・行動パターンが非常に近く、自然と「わかり合える」感覚を持ちやすい。会議での発言スタイルや仕事の進め方が似ているため、連携しやすい。違いは「${diffLabels.join('・')}」で、ここが意見の相違ポイントになりやすい。`;
    } else if (matches === 2) {
      pts = 18;
      reason = `${aMbti}と${bMbti}は${matchLabels.join('・')}が一致、${diffLabels.join('・')}が異なる`;
      detail = `半分は共通しているが、残りの半分で大きな違いがある。特に「${diffLabels.join('・')}」の違いが意思決定や情報の受け取り方に影響する。お互いの違いを理解した上でコミュニケーションすることで、補完的な関係を築ける。`;
    } else if (diffs >= 3) {
      pts = 10; compPts = 15;
      reason = `${aMbti}と${bMbti}は${diffLabels.join('・')}が異なる補完関係`;
      detail = `考え方・行動スタイルが対照的。「なんでこの人はこう考えるんだろう」と感じる場面が多いかもしれないが、それはお互いの強みが違うということ。${aMbti}が得意なことを${bMbti}は苦手とし、逆もしかり。役割分担を明確にするとチームとして機能しやすい。`;
    } else {
      pts = 14;
      reason = `${aMbti}と${bMbti}は中程度の一致（${matchLabels.join('・')}）`;
      detail = `一部は共通しているが、スタイルの差も存在する。特に「${diffLabels.join('・')}」の軸で違いが出やすい。どちらが優れているわけではなく、場面によって強みが変わる関係。`;
    }
    totalRaw += pts; complementaryRaw += compPts;
    breakdown.push({ label: 'MBTI', score: pts, max: 35, reason, detail });
  }

  // ③ モチベーション（最大15点）
  if (a.motivation && b.motivation) {
    maxPossible += 15;
    const same = a.motivation === b.motivation;
    const pts = same ? 15 : 5;
    const aMotDesc = motivationDesc(a.motivation);
    const bMotDesc = motivationDesc(b.motivation);
    totalRaw += pts;
    breakdown.push({
      label: 'モチベーション',
      score: pts, max: 15,
      reason: same ? `ともに「${a.motivation}」を動機とする` : `「${a.motivation}」と「${b.motivation}」で動機が異なる`,
      detail: same
        ? `同じ動機（${aMotDesc}）を持つため、何のために仕事をするかという根本の価値観が一致している。プロジェクトの目標設定やメッセージが刺さりやすい。お互いを鼓舞し合うことができる。`
        : `${aMotDesc}を重視する人と${bMotDesc}を重視する人では、行動の優先順位が異なる。どちらが正しいではなく、「この人はこういう理由で動く」と理解した上で依頼・相談すると効果的。`,
    });
  }

  // ④ 意思決定スタイル（最大10点）
  if (a.decisionStyle && b.decisionStyle) {
    maxPossible += 10;
    const same = a.decisionStyle === b.decisionStyle;
    const pts = same ? 10 : 4;
    if (!same) complementaryRaw += 5;
    const aDecDesc = decisionDesc(a.decisionStyle);
    const bDecDesc = decisionDesc(b.decisionStyle);
    totalRaw += pts;
    breakdown.push({
      label: '意思決定スタイル',
      score: pts, max: 10,
      reason: same ? `ともに「${a.decisionStyle}」で決断のテンポが合う` : `「${a.decisionStyle}」と「${b.decisionStyle}」でスタイルが異なる`,
      detail: same
        ? `意思決定のテンポ・プロセスが似ているため、会議や議論でリズムが合いやすい。（${aDecDesc}）`
        : `${aDecDesc}の人と${bDecDesc}の人が同じ会議にいると、「もう決めよう」「もう少し検討しよう」という摩擦が生じやすい。片方がもう片方のスタイルを尊重する姿勢が大切。うまく機能すれば、スピードと質の両立ができる。`,
    });
  }

  if (maxPossible === 0) {
    const hasFreeText = !!(a.freeText || b.freeText);
    const hasAnyInfo = !!(aEnn || bEnn || aMbti || bMbti);
    return { totalScore: -1, complementaryScore: 0, breakdown: [], label: hasFreeText || hasAnyInfo ? '分析待ち' : '情報不足', color: hasFreeText || hasAnyInfo ? '#a78bfa' : '#d1d5db', summary: '' };
  }

  const totalScore = Math.round((totalRaw / maxPossible) * 100);
  const complementaryScore = Math.round(Math.min(complementaryRaw / maxPossible * 100, 100));

  let label = '中立', color = '#d1d5db';
  if (complementaryScore > 50 && totalScore < 50) { label = '補完関係'; color = '#3b82f6'; }
  else if (totalScore >= 75) { label = '相性◎'; color = '#22c55e'; }
  else if (totalScore >= 55) { label = '相性○'; color = '#86efac'; }
  else if (totalScore < 35) { label = '相性△'; color = '#ef4444'; }

  const summary = buildSummary(totalScore, complementaryScore, breakdown);
  return { totalScore, complementaryScore, breakdown, label, color, summary };
}

// ===== ドラッグ可能な詳細パネル =====
interface PanelData {
  compat: CompatResult;
  aName: string;
  bName: string;
}

function CompatPanel({ data, onClose }: { data: PanelData; onClose: () => void }) {
  const { compat, aName, bName } = data;
  const panelRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState({ x: 40, y: 80 });
  const isDragging = useRef(false);

  function onMouseDown(e: React.MouseEvent) {
    isDragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging.current) return;
    setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  }

  function onMouseUp() { isDragging.current = false; }

  useMemo(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  const color = compat.color;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed', left: pos.x, top: pos.y,
        width: 340, zIndex: 1000,
        background: 'white',
        border: `2px solid ${color}`,
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        userSelect: 'none',
      }}
    >
      {/* ヘッダー（ドラッグハンドル） */}
      <div
        onMouseDown={onMouseDown}
        style={{
          background: color, color: 'white',
          padding: '10px 14px', borderRadius: '10px 10px 0 0',
          cursor: 'grab', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 14 }}>{aName} × {bName}</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            {compat.totalScore >= 0 ? `総合スコア ${compat.totalScore}点 / 100点 — ${compat.label}` : compat.label}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      {/* コンテンツ */}
      <div style={{ padding: '12px 16px', maxHeight: 480, overflowY: 'auto' }}>
        {/* 総評 */}
        {compat.summary && (
          <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#333', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 4, color }}>総評</div>
            {compat.summary}
          </div>
        )}

        {/* 内訳 */}
        {compat.breakdown.map((b, i) => (
          <div key={i} style={{ marginBottom: 12, borderBottom: '1px solid #f0f0f0', paddingBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontWeight: 'bold', fontSize: 12, color: '#333' }}>{b.label}</span>
              <span style={{ fontWeight: 'bold', fontSize: 12, color }}>{b.score}/{b.max}点</span>
            </div>
            <div style={{ background: '#eee', borderRadius: 4, height: 5, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ width: `${(b.score / b.max) * 100}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: 12, color: '#555', fontWeight: '500', marginBottom: 3 }}>{b.reason}</div>
            <div style={{ fontSize: 11, color: '#777', lineHeight: 1.6 }}>{b.detail}</div>
          </div>
        ))}

        {/* 補完スコア */}
        {compat.complementaryScore > 40 && (
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#1d4ed8' }}>
            <div style={{ fontWeight: 'bold', marginBottom: 3 }}>補完スコア: {compat.complementaryScore}点</div>
            <div style={{ lineHeight: 1.6 }}>互いの弱点を補い合える「補完型」の関係。表面的な違いに惑わされず、それぞれの強みを活かす役割分担を意識するとチームとして機能しやすい。</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== カスタムエッジ =====
let globalSetPanel: ((data: PanelData | null) => void) | null = null;

function CompatEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, style }: EdgeProps) {
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
          style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all', zIndex: 10 }}
          className="nodrag nopan"
        >
          <button
            onClick={() => globalSetPanel && globalSetPanel({ compat: data.compat, aName: data.aName, bName: data.bName })}
            style={{
              background: color, color: 'white', fontSize: 11, fontWeight: 'bold',
              padding: '2px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)', whiteSpace: 'nowrap',
            }}
          >
            {scoreLabel}
          </button>
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
  const [panelData, setPanelData] = useState<PanelData | null>(null);
  globalSetPanel = setPanelData;

  const { nodes, edges } = useMemo(() => {
    if (!members || members.length === 0) return { nodes: [], edges: [] };
    const centerX = 400, centerY = 300, baseRadius = 220, count = members.length;

    const selfAsMember: Partial<Member> = selfProfile ? {
      enneagram: selfProfile.enneagram, mbti: selfProfile.mbti, bigfive: selfProfile.bigfive,
    } : {};

    const nodes: Node[] = [{
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
      style: { background: '#eef2ff', border: '2px solid #6366f1', borderRadius: '50%', width: 80, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    }];
    const edges: Edge[] = [];
    const memberCompats = members.map(m => calcCompatibility(m, selfAsMember as Member));

    members.forEach((member, i) => {
      const compat = memberCompats[i];
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
        style: { background: 'white', border: `2px solid ${compat.color}`, borderRadius: 12, width: 100, padding: '6px 4px' },
      });

      edges.push({
        id: `self-${member.id}`, source: 'self', target: member.id, type: 'compatEdge',
        style: { stroke: compat.color, strokeWidth: compat.totalScore >= 70 ? 3 : 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: compat.color },
        data: { compat, aName: '自分', bName: member.name },
      });
    });

    if (showMemberEdges) {
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const compat = calcCompatibility(members[i], members[j]);
          if (compat.label === '情報不足') continue;
          edges.push({
            id: `member-${members[i].id}-${members[j].id}`,
            source: members[i].id, target: members[j].id, type: 'compatEdge',
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
        <div className="text-center"><p className="text-4xl mb-3">🕸️</p><p className="text-gray-500">メンバーを追加するとネットワーク図が表示されます</p></div>
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
      <p className="text-xs text-gray-400 mb-2">スコアをクリックすると詳細パネルが開きます（ドラッグで移動可能）</p>
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ minHeight: 500 }}>
        <ReactFlow nodes={nodes} edges={edges} edgeTypes={edgeTypes} fitView attributionPosition="bottom-right">
          <Background /><Controls /><MiniMap />
        </ReactFlow>
      </div>
      {panelData && <CompatPanel data={panelData} onClose={() => setPanelData(null)} />}
    </div>
  );
}
