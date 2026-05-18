import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveMember } from '../db/hooks';
import { MBTI_OPTIONS, MBTI_GROUPS } from '../constants/mbti';
import { ENNEAGRAM_TYPES } from '../constants/enneagram';
import { DEFAULT_ENNEAGRAM_SCORES } from '../types';
import type { EnneagramScores } from '../types';

function EnneagramScoreInput({
  scores,
  onChange,
}: {
  scores: EnneagramScores;
  onChange: (scores: EnneagramScores) => void;
}) {
  const dominantType = (Object.entries(scores) as [string, number][])
    .reduce((max, [t, s]) => s > max.score ? { type: Number(t), score: s } : max, { type: 0, score: -1 });

  function handleChange(type: number, value: string) {
    const num = Math.min(9, Math.max(0, Number(value) || 0));
    onChange({ ...scores, [type]: num });
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  return (
    <div>
      {totalScore > 0 && dominantType.score > 0 && (
        <p className="text-xs text-indigo-600 mb-2 font-medium">
          主タイプ: タイプ{dominantType.type}（{ENNEAGRAM_TYPES.find(t => t.type === dominantType.type)?.name}）
        </p>
      )}
      <p className="text-xs text-gray-400 mb-3">各タイプへの当てはまり度を 0〜9 で入力（0＝全く当てはまらない、9＝強く当てはまる）</p>
      <div className="space-y-2">
        {ENNEAGRAM_TYPES.map(t => {
          const score = scores[t.type as keyof EnneagramScores];
          const isDominant = totalScore > 0 && t.type === dominantType.type && dominantType.score > 0;
          return (
            <div key={t.type} className={`flex items-center gap-3 p-2 rounded-lg ${isDominant ? 'bg-indigo-50' : ''}`}>
              <div className="w-20 flex-shrink-0">
                <span className={`font-bold text-xs ${isDominant ? 'text-indigo-700' : 'text-gray-700'}`}>タイプ{t.type}</span>
                <p className="text-xs text-gray-400">{t.name}</p>
              </div>
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isDominant ? 'bg-indigo-500' : 'bg-gray-400'}`}
                  style={{ width: `${(score / 9) * 100}%` }}
                />
              </div>
              <input
                type="number"
                min={0}
                max={9}
                value={score}
                onChange={e => handleChange(t.type, e.target.value)}
                className={`w-12 text-center border rounded-lg py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDominant ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-700'
                }`}
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
  const [inputMode, setInputMode] = useState<'manual' | 'ai'>('ai');
  const [freeText, setFreeText] = useState('');

  const [enneagramScores, setEnneagramScores] = useState<EnneagramScores>({ ...DEFAULT_ENNEAGRAM_SCORES });
  const [mbtiType, setMbtiType] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const selectedMBTI = MBTI_OPTIONS.find(o => o.type === mbtiType);
      const totalScore = Object.values(enneagramScores).reduce((a, b) => a + b, 0);
      const dominantType = totalScore > 0
        ? (Object.entries(enneagramScores) as [string, number][])
            .reduce((max, [t, s]) => s > max.score ? { type: Number(t), score: s } : max, { type: 1, score: -1 }).type
        : undefined;

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
        inputMode,
        freeText: freeText || undefined,
        enneagram: dominantType
          ? { type: dominantType, scores: enneagramScores }
          : undefined,
        mbti: mbtiType ? { type: mbtiType, label: selectedMBTI?.label ?? '' } : undefined,
      });
      navigate(`/members/${id}`);
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

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
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className={fieldClass}
                placeholder="例: 田中さん、Tanaka"
                required
              />
            </div>
          </div>

          {/* 関係情報 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">🤝 関係情報</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>役割</label>
                <select value={role} onChange={e => setRole(e.target.value)} className={fieldClass}>
                  <option value="">未設定</option>
                  {['リーダー', 'マネージャー', 'メンバー', 'サポート'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>自分との関係</label>
                <select value={relationship} onChange={e => setRelationship(e.target.value)} className={fieldClass}>
                  <option value="">未設定</option>
                  {['上司', '同僚', '部下', '取引先', '顧客'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>連絡頻度</label>
                <select value={contactFrequency} onChange={e => setContactFrequency(e.target.value)} className={fieldClass}>
                  <option value="">未設定</option>
                  {['毎日', '週次', '月次', '不定期'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>連絡手段</label>
                <select value={communicationStyle} onChange={e => setCommunicationStyle(e.target.value)} className={fieldClass}>
                  <option value="">未設定</option>
                  {['対面', 'テキスト', '電話', 'ビデオ通話'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>意思決定スタイル</label>
                <select value={decisionStyle} onChange={e => setDecisionStyle(e.target.value)} className={fieldClass}>
                  <option value="">未設定</option>
                  {['直感型', '熟考型', '合議型'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 経験情報 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">💼 経験・価値観</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>職種・専門領域</label>
                <input value={jobField} onChange={e => setJobField(e.target.value)} className={fieldClass} placeholder="例: エンジニア、営業" />
              </div>
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
            <div className="mt-4">
              <label className={labelClass}>価値観・大切にしていること（自由記述）</label>
              <input value={values} onChange={e => setValues(e.target.value)} className={fieldClass} placeholder="例: チームワーク、効率性、丁寧さ" />
            </div>
          </div>

          {/* タイプ入力モード */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">🧬 性格タイプ入力方式</h2>
            <div className="flex gap-3 mb-4">
              {(['ai', 'manual'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setInputMode(mode)}
                  className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    inputMode === mode
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {mode === 'ai' ? '🤖 AIに類推させる（フリーテキスト）' : '✍️ 手動で入力'}
                </button>
              ))}
            </div>

            {inputMode === 'ai' ? (
              <div>
                <label className={labelClass}>人物評・印象（AIがタイプを推定します）</label>
                <textarea
                  value={freeText}
                  onChange={e => setFreeText(e.target.value)}
                  className={`${fieldClass} h-28 resize-none`}
                  placeholder="この人の特徴、行動パターン、印象などを自由に書いてください&#10;例: 論理的で細かいことにこだわる。感情より事実を重視する傾向がある。..."
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>エニアグラム</label>
                  <EnneagramScoreInput scores={enneagramScores} onChange={setEnneagramScores} />
                </div>
                <div>
                  <label className={labelClass}>MBTI</label>
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
                <div>
                  <label className={labelClass}>人物評メモ（任意）</label>
                  <textarea
                    value={freeText}
                    onChange={e => setFreeText(e.target.value)}
                    className={`${fieldClass} h-20 resize-none`}
                    placeholder="補足情報があれば入力..."
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-3 rounded-xl transition-colors"
          >
            {saving ? '登録中...' : 'メンバーを登録'}
          </button>
        </form>
      </div>
    </div>
  );
}
