import { useState, useEffect } from 'react';
import { useSelfProfile, saveSelfProfile, useSelfAnalysis, saveSelfAnalysis } from '../db/hooks';
import { MBTI_OPTIONS, MBTI_GROUPS } from '../constants/mbti';
import { ENNEAGRAM_TYPES, SUBTYPES } from '../constants/enneagram';
import { DEFAULT_ENNEAGRAM_SCORES } from '../types';
import type { EnneagramScores } from '../types';
import { analyzeSelf } from '../api/claude';
import { buildSelfAnalysisSystemPrompt, buildSelfAnalysisUserPrompt } from '../api/prompts';

export default function SelfProfilePage() {
  const existing = useSelfProfile();
  const existingAnalysis = useSelfAnalysis();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');

  const [enneagramScores, setEnneagramScores] = useState<EnneagramScores>({ ...DEFAULT_ENNEAGRAM_SCORES });
  const [enneagramSubtype, setEnneagramSubtype] = useState('');
  const [enneagramUnknown, setEnneagramUnknown] = useState(false);
  const [mbtiType, setMbtiType] = useState('INFJ');
  const [mbtiUnknown, setMbtiUnknown] = useState(false);
  const [bigfiveUnknown, setBigfiveUnknown] = useState(false);
  const [bigfive, setBigfive] = useState({
    openness: 50,
    conscientiousness: 50,
    extraversion: 50,
    agreeableness: 50,
    neuroticism: 50,
  });

  useEffect(() => {
    if (existing) {
      if (existing.enneagram.scores) {
        setEnneagramScores(existing.enneagram.scores);
      } else {
        const scores = { ...DEFAULT_ENNEAGRAM_SCORES };
        scores[existing.enneagram.type as keyof EnneagramScores] = 9;
        setEnneagramScores(scores);
      }
      setEnneagramSubtype(existing.enneagram.subtype ?? '');
      setEnneagramUnknown(existing.enneagram.unknown ?? false);
      setMbtiType(existing.mbti.type);
      setMbtiUnknown(existing.mbti.unknown ?? false);
      setBigfive(existing.bigfive);
      setBigfiveUnknown(existing.bigfive.unknown ?? false);
    }
  }, [existing]);

  const dominantType = (Object.entries(enneagramScores) as [string, number][])
    .reduce((max, [t, s]) => s > max.score ? { type: Number(t), score: s } : max, { type: 1, score: -1 })
    .type;

  const selectedMBTI = MBTI_OPTIONS.find(o => o.type === mbtiType)!;

  function handleScoreChange(type: number, value: string) {
    const num = Math.min(9, Math.max(0, Number(value) || 0));
    setEnneagramScores(prev => ({ ...prev, [type]: num }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveSelfProfile({
        enneagram: {
          type: dominantType,
          scores: enneagramScores,
          subtype: enneagramSubtype || undefined,
          unknown: enneagramUnknown,
        },
        mbti: {
          type: mbtiType,
          label: selectedMBTI?.label ?? '',
          unknown: mbtiUnknown,
        },
        bigfive: { ...bigfive, unknown: bigfiveUnknown },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleAnalyze() {
    if (!existing) return;
    setAnalyzing(true);
    setAnalyzeError('');
    try {
      const result = await analyzeSelf(
        buildSelfAnalysisSystemPrompt(),
        buildSelfAnalysisUserPrompt(existing)
      );
      await saveSelfAnalysis(result);
    } catch (e: unknown) {
      setAnalyzeError(e instanceof Error ? e.message : '分析中にエラーが発生しました');
    } finally {
      setAnalyzing(false);
    }
  }

  const bigfiveLabels: Record<keyof typeof bigfive, string> = {
    openness: '開放性',
    conscientiousness: '誠実性',
    extraversion: '外向性',
    agreeableness: '協調性',
    neuroticism: '神経症傾向',
  };

  const totalScore = Object.values(enneagramScores).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">自己プロファイル</h1>
        <p className="text-sm text-gray-500 mb-6">あなたの性格タイプを登録します。これがメンバー分析のバイアス補正基準になります。</p>

        <div className="space-y-6">
          {/* Enneagram */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-gray-900">🔢 エニアグラム</h2>
              <div className="flex items-center gap-2">
                {totalScore > 0 && !enneagramUnknown && (
                  <span className="text-sm text-indigo-600 font-medium">
                    主タイプ: タイプ{dominantType}（{ENNEAGRAM_TYPES.find(t => t.type === dominantType)?.name}）
                  </span>
                )}
                <button type="button" onClick={() => setEnneagramUnknown(!enneagramUnknown)}
                  className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${enneagramUnknown ? 'bg-gray-500 text-white border-gray-500' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                  不明
                </button>
              </div>
            </div>
            {enneagramUnknown ? (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-500">不明に設定されています。AI分析時にこの指標はスキップされます。</div>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-4">各タイプへの当てはまり度を 0〜9 で入力してください</p>
            <div className="space-y-2">
              {ENNEAGRAM_TYPES.map(t => {
                const score = enneagramScores[t.type as keyof EnneagramScores];
                const isDominant = totalScore > 0 && t.type === dominantType;
                return (
                  <div key={t.type} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isDominant ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                    <div className="w-20 flex-shrink-0">
                      <span className={`font-bold text-sm ${isDominant ? 'text-indigo-700' : 'text-gray-700'}`}>タイプ{t.type}</span>
                      <p className="text-xs text-gray-400">{t.name}</p>
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${isDominant ? 'bg-indigo-500' : 'bg-gray-400'}`} style={{ width: `${(score / 9) * 100}%` }} />
                    </div>
                    <input
                      type="number" min={0} max={9} value={score}
                      onChange={e => handleScoreChange(t.type, e.target.value)}
                      className={`w-12 text-center border rounded-lg py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDominant ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-700'}`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-4">
              <label className="block text-sm text-gray-600 mb-1">サブタイプ（任意）</label>
              <select value={enneagramSubtype} onChange={e => setEnneagramSubtype(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">未設定</option>
                {SUBTYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
              </>
            )}
          </div>

          {/* MBTI */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">🧠 MBTI</h2>
              <button type="button" onClick={() => setMbtiUnknown(!mbtiUnknown)}
                className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${mbtiUnknown ? 'bg-gray-500 text-white border-gray-500' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                不明
              </button>
            </div>
            {mbtiUnknown ? (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-500">不明に設定されています。AI分析時にこの指標はスキップされます。</div>
            ) : (
              <>
                <select value={mbtiType} onChange={e => setMbtiType(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {MBTI_GROUPS.map(group => (
                    <optgroup key={group} label={group}>
                      {MBTI_OPTIONS.filter(o => o.group === group).map(o => (
                        <option key={o.type} value={o.type}>{o.label}（{o.type}）</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {selectedMBTI && !mbtiUnknown && <p className="text-sm text-indigo-600 mt-2">選択中: <strong>{selectedMBTI.label}（{selectedMBTI.type}）</strong> — {selectedMBTI.group}</p>}
              </>
            )}
          </div>

          {/* Big Five */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">📊 Big Five</h2>
              <button type="button" onClick={() => setBigfiveUnknown(!bigfiveUnknown)}
                className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${bigfiveUnknown ? 'bg-gray-500 text-white border-gray-500' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                不明
              </button>
            </div>
            {bigfiveUnknown ? (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-500">不明に設定されています。AI分析時にこの指標はスキップされます。</div>
            ) : (
            <div className="space-y-4">
              {(Object.keys(bigfiveLabels) as (keyof typeof bigfive)[]).map(key => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{bigfiveLabels[key]}</span>
                    <span className="font-medium text-indigo-600">{bigfive[key]}</span>
                  </div>
                  <input type="range" min={0} max={100} value={bigfive[key]} onChange={e => setBigfive(prev => ({ ...prev, [key]: Number(e.target.value) }))} className="w-full accent-indigo-600" />
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>低い</span><span>高い</span></div>
                </div>
              ))}
            </div>
            )}
          </div>

          <button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-3 rounded-xl transition-colors">
            {saving ? '保存中...' : saved ? '✓ 保存しました！' : 'プロファイルを保存'}
          </button>

          {/* Self Analysis Section */}
          {existing && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">✨ 自己分析</h2>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                >
                  {analyzing ? '🔄 分析中...' : existingAnalysis ? '再分析する' : 'AI分析する'}
                </button>
              </div>

              {analyzeError && <p className="text-sm text-red-600 mb-3">{analyzeError}</p>}

              {existingAnalysis ? (
                <div className="space-y-4">
                  <div className="bg-green-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-green-800 mb-2">💪 あなたの強み</h3>
                    <ul className="space-y-1">
                      {existingAnalysis.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                          <span className="mt-0.5 flex-shrink-0">✓</span><span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-blue-800 mb-2">🌱 成長ポイント</h3>
                    <ul className="space-y-1">
                      {existingAnalysis.weaknesses.map((w, i) => (
                        <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                          <span className="mt-0.5 flex-shrink-0">→</span><span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-amber-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-amber-800 mb-2">👥 他人からどう見られやすいか</h3>
                    <ul className="space-y-1">
                      {existingAnalysis.howOthersSeeYou.map((h, i) => (
                        <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                          <span className="mt-0.5 flex-shrink-0">•</span><span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-purple-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-purple-800 mb-2">💬 コミュニケーションの傾向</h3>
                    <p className="text-sm text-purple-700">{existingAnalysis.communicationTendencies}</p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">🚀 成長のヒント</h3>
                    <p className="text-sm text-gray-600">{existingAnalysis.growthAreas}</p>
                  </div>

                  {/* 嫌われる理由：上司目線 */}
                  {existingAnalysis.dislikedBySuperior && existingAnalysis.dislikedBySuperior.length > 0 && (
                    <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                      <h3 className="text-sm font-semibold text-red-800 mb-2">😤 上司から嫌われる理由</h3>
                      <p className="text-xs text-red-500 mb-2">自己理解のための辛口フィードバック</p>
                      <ul className="space-y-1.5">
                        {existingAnalysis.dislikedBySuperior.map((s, i) => (
                          <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                            <span className="mt-0.5 flex-shrink-0">•</span><span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 嫌われる理由：同僚・部下目線 */}
                  {existingAnalysis.dislikedByPeer && existingAnalysis.dislikedByPeer.length > 0 && (
                    <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                      <h3 className="text-sm font-semibold text-orange-800 mb-2">😒 同僚・部下から嫌われる理由</h3>
                      <p className="text-xs text-orange-500 mb-2">自己理解のための辛口フィードバック</p>
                      <ul className="space-y-1.5">
                        {existingAnalysis.dislikedByPeer.map((s, i) => (
                          <li key={i} className="text-sm text-orange-700 flex items-start gap-2">
                            <span className="mt-0.5 flex-shrink-0">•</span><span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 text-right">
                    最終更新: {new Date(existingAnalysis.updatedAt).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="text-sm">「AI分析する」ボタンを押すと、あなたのプロファイルに基づいた自己分析が表示されます</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
