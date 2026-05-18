import { useState, useRef, useEffect } from 'react';
import { useSelfProfile, useChatMessages, addChatMessage, clearChatMessages } from '../db/hooks';
import { chatWithAI } from '../api/claude';
import { buildChatSystemPrompt } from '../api/prompts';
import type { ChatMessage } from '../types';

export default function Chat() {
  const selfProfile = useSelfProfile();
  const messages = useChatMessages();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || !selfProfile || sending) return;
    const userText = input.trim();
    setInput('');
    setError('');
    setSending(true);

    try {
      await addChatMessage({ role: 'user', content: userText });

      // 直近20件の履歴をAPIに渡す
      const history = (messages ?? []).slice(-19).map(m => ({
        role: m.role,
        content: m.content,
      }));
      history.push({ role: 'user', content: userText });

      const reply = await chatWithAI(buildChatSystemPrompt(selfProfile), history);
      await addChatMessage({ role: 'assistant', content: reply });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setSending(false);
    }
  }

  async function handleClear() {
    if (!confirm('チャット履歴を全て削除しますか？')) return;
    await clearChatMessages();
  }

  if (!selfProfile) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-4xl mb-3">💬</p>
          <p className="text-gray-500">先に自己プロファイルを登録してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">💬 AIコーチとの対話</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {selfProfile.mbti.label}（{selfProfile.mbti.type}）・タイプ{selfProfile.enneagram.type} として対話します
          </p>
        </div>
        {messages && messages.length > 0 && (
          <button onClick={handleClear} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
            履歴を削除
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {(!messages || messages.length === 0) && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🌙</p>
            <p className="text-gray-500 text-sm mb-2">あなた専用のAIコーチです</p>
            <p className="text-gray-400 text-xs">プロファイルに基づいて、自己理解や人間関係の悩みをサポートします</p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                '自分の強みを教えて',
                '職場での人間関係で悩んでいる',
                '自分がストレスを感じやすい状況は？',
                'コミュニケーションを改善するには？',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {(messages ?? []).map((msg: ChatMessage) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-1">
                🌙
              </div>
            )}
            <div className={`max-w-lg rounded-2xl px-4 py-3 text-sm ${
              msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-sm'
                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
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
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm flex-shrink-0 mr-2">
              🌙
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-5">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            ❌ {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="メッセージを入力... (Shift+Enterで改行)"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium px-5 py-3 rounded-xl transition-colors flex-shrink-0"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
