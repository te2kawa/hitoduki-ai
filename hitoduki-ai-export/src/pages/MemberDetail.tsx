import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMember, useSelfProfile, updateMember, deleteMember } from '../db/hooks';
import { analyzeMemember } from '../api/claude';
import { buildMemberAnalysisSystemPrompt, buildMemberAnalysisUserPrompt } from '../api/prompts';

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const member = useMember(id!);
  const selfProfile = useSelfProfile();
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [freeText, setFreeText] = useState('');
  const [editingFreeText, setEditingFreeText] = useState(false);

  if (!member) return (
    <div className="p-6 text-center text-gray-500">
      <p>メンバーが見つかりません</p>
      <button onClick={() => navigate('/dashboard')} className="mt-2 text-indigo-600 hover:underline">ダッシュボードへ</button>
    </div>
  );

  const result = member.aiInferred;

  async function handleAnalyze() {
    if (!selfProfile) {
      setError('自己プロファイルを先に登録してください');
      return;
    }
    setAnalyzing(true);
    setError('');
    try {
      const currentMember = editingFreeText ? { ...member!, freeText } : member!;
      if (editingFreeText) {
        await updateMember(id!, { freeText });
      }
      const systemPrompt = buildMemberAnalysisSystemPrompt(selfProfile);
      const userPrompt = buildMemberAnalysisUserPrompt(currentMember);
      const analysis = await analyzeMemember(systemPrompt, userPrompt);
      await updateMember(id!, { aiInferred: { ...(member!.aiInferred ?? {}), ...analysis } });
      setEditingFreeText(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '分析中にエラーが発生しました');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`${member!.name}を削除しますか？`)) return;
    await deleteMember(id!);
    navigate('/dashboard');
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
              {member.name[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{member.name}</h1>
              <div className="flex gap-2 mt-1">
                {member.role && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{member.role}</span>}
                {member.relationship && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{member.relationship}</span>}
              </div>
            </div>
          </div>
          <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700">削除</button>
        </div>

        {/* Profile info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">📋 プロファイル情報</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['職種', member.jobField],
              ['経験レベル', member.experienceLevel],
              ['連絡頻度', member.contactFrequency],
              ['連絡手段', member.communicationStyle],
              ['意思決定', member.decisionStyle],
              ['モチベーション', member.motivation],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label as string}>
                <span className="text-gray-500">{label}: </span>
                <span className="text-gray-900">{value}</span>
              </div>
            ))}
          </div>
          {member.values && (
            <div className="mt-3 text-sm">
              <span className="text-gray-500">価値観: </span>
              <span className="text-gray-900">{member.values}</span>
            </div>
          )}
        </div>

        {/* Type info */}
        {(member.enneagram?.type || member.mbti?.type) && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <h2 className="font-semibold text-gray-800 mb-3">🧬 登録タイプ</h2>
            <div className="flex gap-3">
              {member.enneagram?.type && (
                <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                  エニアグラム タイプ{member.enneagram.type}
                </span>
              )}
              {member.mbti?.type && (
                <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  {member.mbti.label}（{member.mbti.type}）
                </span>
              )}
            </div>
          </div>
        )}

        {/* Free text input */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">📝 人物評・メモ</h2>
            {!editingFreeText && (
              <button
                onClick={() => { setFreeText(member.freeText ?? ''); setEditingFreeText(true); }}
                className="text-sm text-indigo-600 hover:underline"
              >
                編集
              </button>
            )}
          </div>
          {editingFreeText ? (
            <div>
              <textarea
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-28 resize-none"
                placeholder="この人の特徴、行動パターン、印象などを自由に..."
              />
              <button
                onClick={() => setEditingFreeText(false)}
                className="mt-2 text-sm text-gray-500 hover:text-gray-700"
              >
                キャンセル
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {member.freeText || <span className="text-gray-400 italic">未入力</span>}
            </p>
          )}
        </div>

        {/* No self profile warning */}
        {!selfProfile && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 mb-4">
            ⚠️ 自己プロファイルを登録すると、バイアス補正が有効になります
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
            ❌ {error}
          </div>
        )}

        {/* Analyze button */}
        <button
          onClick={handleAnalyze}
          disabled={analyzing || !selfProfile}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-3 rounded-xl transition-colors mb-6"
        >
          {analyzing ? '🔄 AI分析中...' : result ? '🔄 再分析する' : '✨ AI分析する'}
        </button>

        {/* Analysis results */}
        {result && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">✨ AI分析結果</h2>

            {result.bias_correction_note && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-amber-800 mb-1">🔍 バイアス補正メモ</h3>
                <p className="text-sm text-amber-700">{result.bias_correction_note}</p>
              </div>
            )}

            {result.strengths && result.strengths.length > 0 && (
              <div className="bg-green-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-green-800 mb-2">💪 強み</h3>
                <ul className="space-y-1">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                      <span className="mt-0.5">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.weaknesses_positive && result.weaknesses_positive.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">🌱 成長ポイント（ポジティブ解釈）</h3>
                <ul className="space-y-1">
                  {result.weaknesses_positive.map((w, i) => (
                    <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                      <span className="mt-0.5">→</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.communication_advice && (
              <div className="bg-purple-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-purple-800 mb-2">💬 コミュニケーションアドバイス</h3>
                <p className="text-sm text-purple-700">{result.communication_advice}</p>
              </div>
            )}

            {member.revisedByReflection && (
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
                ✓ このプロファイルは会議振り返りによって更新されています
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
