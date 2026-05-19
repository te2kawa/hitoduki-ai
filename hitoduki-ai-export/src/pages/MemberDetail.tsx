import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMember, useSelfProfile, updateMember, deleteMember, useMemberChatMessages, addMemberChatMessage, clearMemberChatMessages } from '../db/hooks';
import { analyzeMemember, chatWithAI } from '../api/claude';
import { buildMemberAnalysisSystemPrompt, buildMemberAnalysisUserPrompt, buildMemberChatSystemPrompt } from '../api/prompts';
import { MBTI_OPTIONS, MBTI_GROUPS } from '../constants/mbti';
import { ENNEAGRAM_TYPES } from '../constants/enneagram';
import type { MemberChatMessage, MemberIndicatorModes } from '../types';

// ===== チャットコンポーネント =====
function MemberChat({ memberId }: { memberId: string }) {
  const member = useMember(memberId);
  const selfProfile = useSelfProfile();
  const messages = useMemberChatMessages(memberId);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || !selfProfile || !member || sending) return;
    const userText = input.trim();
    setInput('');
    setError('');
    setSending(true);
    try {
      await addMemberChatMessage({ memberId, role: 'user', content: userText });
      const history = (messages ?? []).slice(-19).map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: userText });
      const reply = await chatWithAI(buildMemberChatSystemPrompt(selfProfile, member), history);
      await addMemberChatMessage({ memberId, role: 'assistant', content: reply });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setSending(false);
    }
  }

  if (!selfProfile) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        自己プロファイルを登録するとチャットが利用できます
      </div>
    );
  }

  const memberName = member?.name ?? 'このメンバー';

  const suggestions = [
    `${memberName}さんとの1on1でどう話せばいい？`,
    `${memberName}さんが落ち込んでいる。何て声をかけよう？`,
    `${memberName}さんに仕事を依頼するコツは？`,
    `${memberName}さんと意見が対立した時の対処法`,
  ];

  return (
    <div className="flex flex-col" style={{ height: 500 }}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <p className="text-sm font-medium text-gray-800">{memberName}さんとのコミュニケーション相談</p>
          <p className="text-xs text-gray-400 mt-0.5">二者間の特性に基づいてアドバイスします</p>
        </div>
        {messages && messages.length > 0 && (
          <button onClick={() => clearMemberChatMessages(memberId)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
            履歴削除
          </button>
        )}
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {(!messages || messages.length === 0) && (
          <div className="text-center py-6">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-gray-400 text-xs mb-4">{memberName}さんとのコミュニケーションについて何でも相談してください</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors text-left">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {(messages ?? []).map((msg: MemberChatMessage) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs flex-shrink-0 mr-2 mt-1">🌙</div>
            )}
            <div className={`max-w-sm rounded-2xl px-3 py-2 text-sm ${
              msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                {new Date(msg.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs flex-shrink-0 mr-2">🌙</div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-3 py-2">
              <div className="flex gap-1 items-center h-4">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-600 text-center">{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div className="border-t border-gray-100 px-4 py-3 flex gap-2 items-end">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="相談を入力... (Shift+Enterで改行)"
          className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          rows={2}
        />
        <button onClick={handleSend} disabled={sending || !input.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors flex-shrink-0">
          送信
        </button>
      </div>
    </div>
  );
}

// ===== メインページ =====
export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const member = useMember(id!);
  const selfProfile = useSelfProfile();
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [freeText, setFreeText] = useState('');
  const [editingFreeText, setEditingFreeText] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'chat'>('profile');
  const [editingTypes, setEditingTypes] = useState(false);
  const [editEnneagramType, setEditEnneagramType] = useState<number | ''>('');
  const [editMbtiType, setEditMbtiType] = useState('');
  const [editIndicatorModes, setEditIndicatorModes] = useState<MemberIndicatorModes>({ enneagram: 'unknown', mbti: 'unknown', bigfive: 'unknown' });

  if (!member) return (
    <div className="p-6 text-center text-gray-500">
      <p>メンバーが見つかりません</p>
      <button onClick={() => navigate('/dashboard')} className="mt-2 text-indigo-600 hover:underline">ダッシュボードへ</button>
    </div>
  );

  const result = member.aiInferred;

  function startEditingTypes() {
    setEditEnneagramType(member!.enneagram?.type && !member!.enneagram?.unknown ? member!.enneagram.type : '');
    setEditMbtiType(member!.mbti?.type && !member!.mbti?.unknown ? member!.mbti.type : '');
    setEditIndicatorModes({
      enneagram: member!.enneagram?.unknown ? 'unknown' : member!.enneagram?.type ? 'manual' : 'unknown',
      mbti: member!.mbti?.unknown ? 'unknown' : member!.mbti?.type ? 'manual' : 'unknown',
      bigfive: member!.bigfive?.unknown ? 'unknown' : 'unknown',
    });
    setEditingTypes(true);
  }

  async function handleSaveTypes() {
    const MBTI_OPTS = (await import('../constants/mbti')).MBTI_OPTIONS;
    const selectedMBTI = MBTI_OPTS.find(o => o.type === editMbtiType);
    await updateMember(id!, {
      enneagram: editIndicatorModes.enneagram === 'manual' && editEnneagramType !== ''
        ? { type: Number(editEnneagramType), unknown: false }
        : { type: 0, unknown: true },
      mbti: editIndicatorModes.mbti === 'manual' && editMbtiType
        ? { type: editMbtiType, label: selectedMBTI?.label ?? '', unknown: false }
        : { type: '', unknown: true },
      indicatorModes: editIndicatorModes,
    });
    setEditingTypes(false);
  }

  async function handleAnalyze() {
    if (!selfProfile) { setError('自己プロファイルを先に登録してください'); return; }
    setAnalyzing(true);
    setError('');
    try {
      const currentMember = editingFreeText ? { ...member!, freeText } : member!;
      if (editingFreeText) await updateMember(id!, { freeText });
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
        <div className="flex items-start justify-between mb-5">
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

        {/* タブ */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
          >
            📋 プロファイル・分析
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'chat' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
          >
            💬 コミュニケーション相談
          </button>
        </div>

        {/* プロファイルタブ */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            {/* Profile info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
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

            {/* Type info - 編集可能 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800">🧬 登録タイプ</h2>
                {!editingTypes && (
                  <button onClick={startEditingTypes} className="text-sm text-indigo-600 hover:underline">編集</button>
                )}
              </div>

              {editingTypes ? (
                <div className="space-y-4">
                  {/* エニアグラム */}
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-gray-700 w-28">エニアグラム</span>
                      <div className="flex gap-1.5">
                        {(['manual', 'unknown'] as const).map(m => (
                          <button key={m} type="button"
                            onClick={() => setEditIndicatorModes(prev => ({ ...prev, enneagram: m }))}
                            className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                              editIndicatorModes.enneagram === m
                                ? m === 'manual' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-500 text-white border-gray-500'
                                : 'border-gray-300 text-gray-600'
                            }`}>
                            {m === 'manual' ? '手動入力' : '不明'}
                          </button>
                        ))}
                      </div>
                    </div>
                    {editIndicatorModes.enneagram === 'manual' && (
                      <select value={editEnneagramType} onChange={e => setEditEnneagramType(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">未設定</option>
                        {ENNEAGRAM_TYPES.map(t => (
                          <option key={t.type} value={t.type}>タイプ{t.type}（{t.name}）</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* MBTI */}
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-gray-700 w-28">MBTI</span>
                      <div className="flex gap-1.5">
                        {(['manual', 'unknown'] as const).map(m => (
                          <button key={m} type="button"
                            onClick={() => setEditIndicatorModes(prev => ({ ...prev, mbti: m }))}
                            className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                              editIndicatorModes.mbti === m
                                ? m === 'manual' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-500 text-white border-gray-500'
                                : 'border-gray-300 text-gray-600'
                            }`}>
                            {m === 'manual' ? '手動入力' : '不明'}
                          </button>
                        ))}
                      </div>
                    </div>
                    {editIndicatorModes.mbti === 'manual' && (
                      <select value={editMbtiType} onChange={e => setEditMbtiType(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">未設定</option>
                        {MBTI_GROUPS.map(group => (
                          <optgroup key={group} label={group}>
                            {MBTI_OPTIONS.filter(o => o.group === group).map(o => (
                              <option key={o.type} value={o.type}>{o.label}（{o.type}）</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={handleSaveTypes}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                      保存
                    </button>
                    <button onClick={() => setEditingTypes(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 flex-wrap">
                  {member.enneagram?.type && !member.enneagram.unknown ? (
                    <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                      エニアグラム タイプ{member.enneagram.type}
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-400 px-3 py-1 rounded-full text-sm">エニアグラム：不明</span>
                  )}
                  {member.mbti?.type && !member.mbti.unknown ? (
                    <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                      {member.mbti.label}（{member.mbti.type}）
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-400 px-3 py-1 rounded-full text-sm">MBTI：不明</span>
                  )}
                </div>
              )}
            </div>

            {/* Free text */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800">📝 人物評・メモ</h2>
                {!editingFreeText && (
                  <button onClick={() => { setFreeText(member.freeText ?? ''); setEditingFreeText(true); }} className="text-sm text-indigo-600 hover:underline">編集</button>
                )}
              </div>
              {editingFreeText ? (
                <div>
                  <textarea value={freeText} onChange={e => setFreeText(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-28 resize-none"
                    placeholder="この人の特徴、行動パターン、印象などを自由に..." />
                  <button onClick={() => setEditingFreeText(false)} className="mt-2 text-sm text-gray-500 hover:text-gray-700">キャンセル</button>
                </div>
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {member.freeText || <span className="text-gray-400 italic">未入力</span>}
                </p>
              )}
            </div>

            {!selfProfile && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                ⚠️ 自己プロファイルを登録するとバイアス補正が有効になります
              </div>
            )}
            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">❌ {error}</div>}

            <button onClick={handleAnalyze} disabled={analyzing || !selfProfile}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-3 rounded-xl transition-colors">
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
                        <li key={i} className="text-sm text-green-700 flex items-start gap-2"><span>✓</span><span>{s}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.weaknesses_positive && result.weaknesses_positive.length > 0 && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-blue-800 mb-2">🌱 成長ポイント（ポジティブ解釈）</h3>
                    <ul className="space-y-1">
                      {result.weaknesses_positive.map((w, i) => (
                        <li key={i} className="text-sm text-blue-700 flex items-start gap-2"><span>→</span><span>{w}</span></li>
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
        )}

        {/* チャットタブ */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <MemberChat memberId={id!} />
          </div>
        )}
      </div>
    </div>
  );
}
