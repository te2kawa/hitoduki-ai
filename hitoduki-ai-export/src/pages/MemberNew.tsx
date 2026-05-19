import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveMember } from '../db/hooks';
import { MBTI_OPTIONS, MBTI_GROUPS } from '../constants/mbti';
import { ENNEAGRAM_TYPES, SUBTYPES } from '../constants/enneagram';
import { DEFAULT_ENNEAGRAM_SCORES } from '../types';
import type { EnneagramScores, IndicatorMode, MemberIndicatorModes } from '../types';

function IndicatorModeSelector({ mode, onChange, label }: { mode: IndicatorMode; onChange: (m: IndicatorMode) => void; label: string }) {
  const modes: { value: IndicatorMode; label: string; active: string; inactive: string }[] = [
    { value: 'manual', label: '手動入力', active: 'bg-indigo-600 text-white border-indigo-600', inactive: 'border-gray-300 text-gray-600 hover:border-gray-400' },
    { value: 'ai', label: 'AI類推', active: 'bg-purple-600 text-white border-purple-600', inactive: 'border-gray-300 text-gray-600 hover:border-gray-400' },
    { value: 'unknown', label: '不明', active: 'bg-gray-500 text-white border-gray-500', inactive: 'border-gray-300 text-gray-600 hover:border-gray-400' },
  ];
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700 w-28 flex-shrink-0">{label}</span>
      <div className="flex gap-1.5">
        {modes.map(m => (
          <button key={m.value} type="button" onClick={() => onChange(m.value)}
            className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${mode === m.value ? m.active : m.inactive}`}>
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function EnneagramScoreInput({ scores, onChange }: { scores: EnneagramScores; onChange: (s: EnneagramScores) => void }) {
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const dominantType = totalScore > 0
    ? (Object.entries(scores) as [string, number][]).reduce((max, [t, s]) => s > max.score ? { type: Number(t), score: s } : max, { type: 1, score: -1 })
    : null;
  return (
    <div>
      {dominantType && dominantType.score > 0 && (
        <p className="text-xs text-indigo-600 mb-2 font-medium">主タイプ: タイプ{dominantType.type}（{ENNEAGRAM_TYPES.find(t => t.type === dominantType.type)?.name}）</p>
      )}
      <p className="text-xs text-gray-400 mb-2">各タイプへの当てはまり度を 0〜9 で入力</p>
      <div className="space-y-1.5">
        {ENNEAGRAM_TYPES.map(t => {
          const score = scores[t.type as keyof EnneagramScores];
          const isDominant = dominantType && t.type === dominantType.type && dominantType.score > 0;
          return (
            <div key={t.type} className={`flex items-center gap-3 p-1.5 rounded-lg ${isDominant ? 'bg-indigo-50' : ''}`}>
              <div className="w-20 flex-shrink-0">
                <span className={`font-bold text-xs ${isDominant ? 'text-indigo-700' : 'text-gray-700'}`}>タイプ{t.type}</span>
                <p className="text-xs text-gray-400">{t.name}</p>
              </div>
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${isDominant ? 'bg-indigo-500' : 'bg-gray-300'}`} style={{ width: `${(score / 9) * 100}%` }} />
              </div>
              <input type="number" min={0} max={9} value={score}
                onChange={e => onChange({ ...scores, [t.type]: Math.min(9, Math.max(0, Number(e.target.value) || 0)) })}
                className={`w-12 text-center border rounded-lg py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDominant ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-700'}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MemberNew() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [relationship, setRelationship] = useState('');
  const [contactFrequency, setContactFrequency] = useState('');
  const [communicationStyle, setCommunicationStyle] = useState('');
  const [decisionStyle, setDecisionStyle] = useState('');
  const [jobField, setJobField] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [values, setValues] = useState('');
  const [motivation, setMotivation] = useState('');
  const [freeText, setFreeText] = useState('');
  const [indicatorModes, setIndicatorModes] = useState<MemberIndicatorModes>({ enneagram: 'unknown', mbti: 'unknown', bigfive: 'unknown' });
  const [enneagramScores, setEnneagramScores] = useState<EnneagramScores>({ ...DEFAULT_ENNEAGRAM_SCORES });
  const [enneagramSubtype, setEnneagramSubtype] = useState('');
  const [mbtiType, setMbtiType] = useState('');
  const [bigfive, setBigfive] = useState({ openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 });

  function setMode(indicator: keyof MemberIndicatorModes, mode: IndicatorMode) {
    setIndicatorModes(prev => ({ ...prev, [indicator]: mode }));
  }

  const needsFreeText = Object.values(indicatorModes).some(m => m === 'ai');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const selectedMBTI = MBTI_OPTIONS.find(o => o.type === mbtiType);
      const totalScore = Object.values(enneagramScores).reduce((a, b) => a + b, 0);
      const dominantType = totalScore > 0
        ? (Object.entries(enneagramScores) as [string, number][]).reduce((max, [t, s]) => s > max.score ? { type: Number(t), score: s } : max, { type: 1, score: -1 }).type
        : 1;
      const id = await saveMember({
        name: name.trim(),
        role: role || undefined,
        relationship: relationship || undefined,
        contactFrequency: contactFrequency || undefined,
        communicationStyle: communicationStyle || undefined,
        decisionStyle: decisionStyle || undefined,
        jobField: jobField || undefined,
        experienceLevel: experienceLevel || undefined,
        values: values || undefined,
        motivation: motivation || undefined,
        inputMode: needsFreeText ? 'ai' : 'manual',
        indicatorModes,
        freeText: freeText || undefined,
        enneagram: indicatorModes.enneagram === 'manual' ? { type: dominantType, scores: enneagramScores, subtype: enneagramSubtype || undefined }
          : indicatorModes.enneagram === 'unknown' ? { type: 0, unknown: true } : undefined,
        mbti: indicatorModes.mbti === 'manual' && mbtiType ? { type: mbtiType, label: selectedMBTI?.label ?? '' }
          : indicatorModes.mbti === 'unknown' ? { type: '', unknown: true } : undefined,
        bigfive: indicatorModes.bigfive === 'manual' ? bigfive
          : indicatorModes.bigfive === 'unknown' ? { ...bigfive, unknown: true } : undefined,
      });
      navigate(`/members/${id}`);
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const bigfiveLabels: Record<string, string> = { openness: '開放性', conscientiousness: '誠実性', extraversion: '外向性', agreeableness: '協調性', neuroticism: '神経症傾向' };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">メンバーを追加</h1>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* 基本情報 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">👤 基本情報</h2>
            <div>
              <label className={labelClass}>名前 / ニックネーム <span className="text-red-500">*</span></label>
              <input value={name} onChange={e => setName(e.target.value)} className={fieldClass} placeholder="例: 田中さん" required />
            </div>
          </div>

          {/* 関係情報 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">🤝 関係情報</h2>
            <div className="grid grid-cols-2 gap-4">
              {([
                { label: '役割', value: role, set: setRole, opts: ['リーダー', 'マネージャー', 'メンバー', 'サポート'] },
                { label: '自分との関係', value: relationship, set: setRelationship, opts: ['上司', '同僚', '部下', '取引先', '顧客'] },
                { label: '連絡頻度', value: contactFrequency, set: setContactFrequency, opts: ['毎日', '週次', '月次', '不定期'] },
                { label: '連絡手段', value: communicationStyle, set: setCommunicationStyle, opts: ['対面', 'テキスト', '電話', 'ビデオ通話'] },
                { label: '意思決定', value: decisionStyle, set: setDecisionStyle, opts: ['直感型', '熟考型', '合議型'] },
              ] as const).map(({ label, value, set, opts }) => (
                <div key={label}>
                  <label className={labelClass}>{label}</label>
                  <select value={value} onChange={e => (set as (v: string) => void)(e.target.value)} className={fieldClass}>
                    <option value="">未設定</option>
                    {(opts as readonly string[]).map((o: string) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* 経験・価値観 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">💼 経験・価値観</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>職種</label><input value={jobField} onChange={e => setJobField(e.target.value)} className={fieldClass} placeholder="例: エンジニア" /></div>
              <div>
                <label className={labelClass}>経験レベル</label>
                <select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)} className={fieldClass}>
                  <option value="">未設定</option>
                  {['新人', '中堅', 'ベテラン'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>モチベーション</label>
                <select value={motivation} onChange={e => setMotivation(e.target.value)} className={fieldClass}>
                  <option value="">未設定</option>
                  {['成長', '安定', '貢献', '認められること', '自律性'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4"><label className={labelClass}>価値観</label><input value={values} onChange={e => setValues(e.target.value)} className={fieldClass} placeholder="例: チームワーク、効率性" /></div>
          </div>

          {/* 性格タイプ */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-1">🧬 性格タイプ</h2>
            <p className="text-xs text-gray-500 mb-4">各指標ごとに独立して設定できます。わからない指標は「不明」を選択してください。</p>

            {/* モード選択 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
              <IndicatorModeSelector label="エニアグラム" mode={indicatorModes.enneagram} onChange={m => setMode('enneagram', m)} />
              <IndicatorModeSelector label="MBTI" mode={indicatorModes.mbti} onChange={m => setMode('mbti', m)} />
              <IndicatorModeSelector label="Big Five" mode={indicatorModes.bigfive} onChange={m => setMode('bigfive', m)} />
            </div>

            {/* エニアグラム入力エリア */}
            {indicatorModes.enneagram === 'manual' && (
              <div className="border border-indigo-100 rounded-lg p-4 mb-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">🔢 エニアグラム</h3>
                <EnneagramScoreInput scores={enneagramScores} onChange={setEnneagramScores} />
                <div className="mt-3">
                  <label className={labelClass}>サブタイプ（任意）</label>
                  <select value={enneagramSubtype} onChange={e => setEnneagramSubtype(e.target.value)} className={fieldClass}>
                    <option value="">未設定</option>
                    {SUBTYPES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            )}
            {indicatorModes.enneagram === 'ai' && (
              <div className="bg-purple-50 rounded-lg p-3 mb-3 text-xs text-purple-700">🔢 エニアグラム：テキストから AI が推定します</div>
            )}
            {indicatorModes.enneagram === 'unknown' && (
              <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-500">🔢 エニアグラム：不明（分析時にスキップ）</div>
            )}

            {/* MBTI入力エリア */}
            {indicatorModes.mbti === 'manual' && (
              <div className="border border-indigo-100 rounded-lg p-4 mb-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">🧠 MBTI</h3>
                <select value={mbtiType} onChange={e => setMbtiType(e.target.value)} className={fieldClass}>
                  <option value="">未設定</option>
                  {MBTI_GROUPS.map(group => (
                    <optgroup key={group} label={group}>
                      {MBTI_OPTIONS.filter(o => o.group === group).map(o => (
                        <option key={o.type} value={o.type}>{o.label}（{o.type}）</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}
            {indicatorModes.mbti === 'ai' && (
              <div className="bg-purple-50 rounded-lg p-3 mb-3 text-xs text-purple-700">🧠 MBTI：テキストから AI が推定します</div>
            )}
            {indicatorModes.mbti === 'unknown' && (
              <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-500">🧠 MBTI：不明（分析時にスキップ）</div>
            )}

            {/* Big Five入力エリア */}
            {indicatorModes.bigfive === 'manual' && (
              <div className="border border-indigo-100 rounded-lg p-4 mb-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Big Five</h3>
                <div className="space-y-3">
                  {(Object.keys(bigfiveLabels) as (keyof typeof bigfive)[]).map(key => (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{bigfiveLabels[key]}</span>
                        <span className="font-medium text-indigo-600">{bigfive[key]}</span>
                      </div>
                      <input type="range" min={0} max={100} value={bigfive[key]} onChange={e => setBigfive(prev => ({ ...prev, [key]: Number(e.target.value) }))} className="w-full accent-indigo-600" />
                      <div className="flex justify-between text-xs text-gray-400"><span>低い</span><span>高い</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {indicatorModes.bigfive === 'ai' && (
              <div className="bg-purple-50 rounded-lg p-3 mb-3 text-xs text-purple-700">📊 Big Five：テキストから AI が推定します</div>
            )}
            {indicatorModes.bigfive === 'unknown' && (
              <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-500">📊 Big Five：不明（分析時にスキップ）</div>
            )}

            {/* フリーテキスト（AI類推がある場合） */}
            {needsFreeText && (
              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                <h3 className="text-sm font-semibold text-purple-700 mb-1">🤖 AI類推用・人物評テキスト</h3>
                <p className="text-xs text-purple-600 mb-2">「AI類推」に設定した指標はこのテキストから推定されます</p>
                <textarea value={freeText} onChange={e => setFreeText(e.target.value)}
                  className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 h-24 resize-none bg-white"
                  placeholder="この人の特徴、行動パターン、印象などを自由に書いてください..." />
              </div>
            )}
            {!needsFreeText && (
              <div>
                <label className={labelClass}>補足メモ（任意）</label>
                <textarea value={freeText} onChange={e => setFreeText(e.target.value)} className={`${fieldClass} h-16 resize-none`} placeholder="補足情報があれば..." />
              </div>
            )}
          </div>

          <button type="submit" disabled={saving || !name.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-3 rounded-xl transition-colors">
            {saving ? '登録中...' : 'メンバーを登録'}
          </button>
        </form>
      </div>
    </div>
  );
}
