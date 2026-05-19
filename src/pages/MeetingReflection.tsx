import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMeeting, useMembers, updateMeeting, updateMember } from '../db/hooks';
import { analyzeReflection } from '../api/claude';
import { buildReflectionSystemPrompt } from '../api/prompts';

type Rating = '◎' | '○' | '△' | '×';

export default function MeetingReflection() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const meeting = useMeeting(id!);
  const members = useMembers();

  const [memo, setMemo] = useState('');
  const [rating, setRating] = useState<Rating>('○');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [divergenceResult, setDivergenceResult] = useState<{
    divergence_detected: boolean;
    divergence_note: string;
    proposals: { member_id: string; field: string; old_value: string; new_value: string; reason: string }[];
  } | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!meeting) return <div className="p-6 text-gray-500">会議が見つかりません</div>;

  const participants = (members ?? []).filter(m => meeting.participantIds.includes(m.id));
  const getMemberName = (mid: string) => participants.find(p => p.id === mid)?.name ?? mid;

  async function handleSaveAndAnalyze() {
    setAnalyzing(true);
    setError('');
    try {
      const userPrompt = `【会議前アドバイス】\n${JSON.stringify(meeting?.adviceResult, null, 2)}\n\n【振り返りメモ】\n${memo}\n\n【評価】${rating}`;
      const result = await analyzeReflection(buildReflectionSystemPrompt(), userPrompt);
      setDivergenceResult(result);

      await updateMeeting(id!, {
        reflection: {
          memo,
          rating,
          divergenceNote: result.divergence_note,
          updateProposals: result.proposals,
        },
      });

      // AI mode members: show dialog if divergence detected
      const aiModeParticipants = participants.filter(p => p.inputMode === 'ai');
      const hasAiProposals = result.proposals.some(p =>
        aiModeParticipants.some(m => m.id === p.member_id)
      );

      if (result.divergence_detected && hasAiProposals) {
        setShowUpdateDialog(true);
      } else {
        setSaved(true);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleApplyUpdates() {
    if (!divergenceResult) return;
    for (const proposal of divergenceResult.proposals) {
      const member = participants.find(m => m.id === proposal.member_id);
      if (!member || member.inputMode !== 'ai') continue;
      // Apply the proposed update (simplified: update mbti type if field is mbti.type)
      const updates: Record<string, unknown> = { revisedByReflection: true };
      if (proposal.field === 'mbti.type') {
        const mbtiOpts = await import('../constants/mbti').then(m => m.MBTI_OPTIONS);
        const opt = mbtiOpts.find(o => o.type === proposal.new_value);
        updates.aiInferred = {
          ...(member.aiInferred ?? {}),
          mbti: { type: proposal.new_value, label: opt?.label ?? '' },
        };
      }
      await updateMember(proposal.member_id, updates);
    }
    setShowUpdateDialog(false);
    setSaved(true);
  }

  const ratings: Rating[] = ['◎', '○', '△', '×'];
  const ratingColors: Record<Rating, string> = {
    '◎': 'border-green-500 bg-green-50 text-green-700',
    '○': 'border-blue-500 bg-blue-50 text-blue-700',
    '△': 'border-amber-500 bg-amber-50 text-amber-700',
    '×': 'border-red-500 bg-red-50 text-red-700',
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">会議振り返り</h1>
        <p className="text-sm text-gray-500 mb-6">{meeting.title}</p>

        <div className="space-y-5">
          {/* Rating */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">評価</h2>
            <div className="flex gap-3">
              {ratings.map(r => (
                <button
                  key={r}
                  onClick={() => setRating(r)}
                  className={`flex-1 py-3 rounded-lg border-2 text-xl font-bold transition-colors ${
                    rating === r ? ratingColors[r] : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Memo */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">振り返りメモ</h2>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="会議の結果、予想と違ったこと、各メンバーの反応など..."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Save button */}
          <button
            onClick={handleSaveAndAnalyze}
            disabled={analyzing || !memo.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-3 rounded-xl transition-colors"
          >
            {analyzing ? '🔄 振り返りを分析中...' : '📝 振り返りを保存して分析'}
          </button>

          {/* Divergence results */}
          {divergenceResult && (
            <div className="space-y-4">
              <div className={`rounded-xl border p-4 ${divergenceResult.divergence_detected ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                <h3 className={`font-semibold mb-2 ${divergenceResult.divergence_detected ? 'text-amber-800' : 'text-green-800'}`}>
                  {divergenceResult.divergence_detected ? '⚠️ 診断の乖離が検出されました' : '✓ 診断は概ね正確でした'}
                </h3>
                <p className={`text-sm ${divergenceResult.divergence_detected ? 'text-amber-700' : 'text-green-700'}`}>
                  {divergenceResult.divergence_note}
                </p>
              </div>

              {/* Manual mode suggestions */}
              {divergenceResult.proposals.filter(p => {
                const member = participants.find(m => m.id === p.member_id);
                return member?.inputMode === 'manual';
              }).map((p, i) => (
                <div key={i} className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-blue-800 mb-1">
                    💡 {getMemberName(p.member_id)} への示唆
                  </h3>
                  <p className="text-sm text-blue-700">
                    {getMemberName(p.member_id)}さんは{p.reason}
                  </p>
                  <p className="text-xs text-blue-500 mt-1">※ 手動入力のため、データは変更しません</p>
                </div>
              ))}
            </div>
          )}

          {/* Update dialog */}
          {showUpdateDialog && divergenceResult && (
            <div className="bg-white rounded-xl border-2 border-indigo-300 p-5">
              <h3 className="font-semibold text-indigo-900 mb-3">🔄 診断を更新しますか？</h3>
              <div className="space-y-2 mb-4">
                {divergenceResult.proposals.filter(p => {
                  const member = participants.find(m => m.id === p.member_id);
                  return member?.inputMode === 'ai';
                }).map((p, i) => (
                  <div key={i} className="bg-indigo-50 rounded-lg p-3 text-sm">
                    <p className="font-medium text-indigo-700">{getMemberName(p.member_id)}</p>
                    <p className="text-gray-600 mt-0.5">{p.field}: {p.old_value} → <strong>{p.new_value}</strong></p>
                    <p className="text-gray-500 text-xs mt-0.5">{p.reason}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={handleApplyUpdates}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm">
                  更新する
                </button>
                <button onClick={() => { setShowUpdateDialog(false); setSaved(true); }}
                  className="flex-1 border border-gray-300 text-gray-600 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50">
                  このまま保持
                </button>
              </div>
            </div>
          )}

          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-green-700 font-medium">✓ 振り返りを保存しました</p>
              <button onClick={() => navigate(`/meetings/${id}`)} className="mt-2 text-sm text-indigo-600 hover:underline">
                会議詳細に戻る
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
