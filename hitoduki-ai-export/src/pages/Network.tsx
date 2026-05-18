import { useMemo } from 'react';
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

const RELATIONSHIP_COLORS: Record<string, string> = {
  '上司': '#6366f1',
  '同僚': '#22c55e',
  '部下': '#f59e0b',
  '取引先': '#ec4899',
  '顧客': '#14b8a6',
  default: '#94a3b8',
};

export default function Network() {
  const members = useMembers();
  const selfProfile = useSelfProfile();
  const navigate = useNavigate();

  const { nodes, edges } = useMemo(() => {
    if (!members) return { nodes: [], edges: [] };

    const centerX = 400;
    const centerY = 300;
    const radius = 220;
    const count = members.length;

    const nodes: Node[] = [
      {
        id: 'self',
        data: {
          label: (
            <div className="text-center">
              <div className="font-bold text-indigo-700">自分</div>
              {selfProfile && (
                <div className="text-xs text-indigo-500">{selfProfile.mbti.type}</div>
              )}
            </div>
          ),
        },
        position: { x: centerX - 40, y: centerY - 30 },
        style: {
          background: '#eef2ff',
          border: '2px solid #6366f1',
          borderRadius: '50%',
          width: 80,
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
    ];

    const edges: Edge[] = [];

    members.forEach((member, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle) - 50;
      const y = centerY + radius * Math.sin(angle) - 30;

      const mbtiType = member.aiInferred?.mbti?.type || member.mbti?.type;
      const color = RELATIONSHIP_COLORS[member.relationship ?? ''] ?? RELATIONSHIP_COLORS.default;

      nodes.push({
        id: member.id,
        data: {
          label: (
            <div
              className="text-center cursor-pointer"
              onClick={() => navigate(`/members/${member.id}`)}
            >
              <div className="font-bold text-gray-800">{member.name}</div>
              {mbtiType && <div className="text-xs text-gray-500">{mbtiType}</div>}
              {member.relationship && <div className="text-xs mt-0.5" style={{ color }}>{member.relationship}</div>}
            </div>
          ),
        },
        position: { x, y },
        style: {
          background: 'white',
          border: `2px solid ${color}`,
          borderRadius: 12,
          width: 100,
          padding: '8px 4px',
        },
      });

      edges.push({
        id: `self-${member.id}`,
        source: 'self',
        target: member.id,
        style: { stroke: color, strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color },
        label: member.relationship,
        labelStyle: { fontSize: 10, fill: color },
      });
    });

    return { nodes, edges };
  }, [members, selfProfile, navigate]);

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
        <div className="flex gap-3 text-xs">
          {Object.entries(RELATIONSHIP_COLORS).filter(([k]) => k !== 'default').map(([rel, color]) => (
            <span key={rel} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
              {rel}
            </span>
          ))}
        </div>
      </div>
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ minHeight: 500 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          attributionPosition="bottom-right"
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
      <p className="text-xs text-gray-400 mt-2">ノードをクリックするとメンバー詳細へ移動します</p>
    </div>
  );
}
