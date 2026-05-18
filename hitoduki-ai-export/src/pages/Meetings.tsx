import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMeetings, useMembers, useSelfProfile, saveMeeting } from '../db/hooks';
import { getMeetingAdvice } from '../api/claude';
import { buildMeetingSystemPrompt } from '../api/prompts';

export default function Meetings() {
  const meetings = useMeetings();
  const members = useMembers();
  const selfProfile = useSelfProfile();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [agenda, setAgenda] = useState('');
  const [concerns, setConcerns] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title || selectedIds.length === 0 || !agenda) return;
    if (!selfProfile) { setError('自己プロファイルを先に登録してください'); return; }
    setCreating(true);
    setError('');
    try {
      const participants = (members ?? []).filter(m => selectedIds.includes(m.id));
      const systemPrompt = buildMeetingSystemPrompt(selfProfile, participants);
      const userPrompt = `【会議タイトル】${title}\n【アジェンダ】${agenda}${concerns ? `\n【懸念点】${concerns}` : ''}`;
      const advice = await getMeetingAdvice(systemPrompt, userPrompt);
      const id = await saveMeeting({
        title,
        participantIds: selectedIds,
        agenda,
        concerns: concerns || undefined,
        adviceResult: advice,
      });
      setShowForm(false);
      navigate(`/meetings/${id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setCreating(false);
    }
  }

  function toggleMember(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const fieldClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">会議相談</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            ＋ 新しい相談
          </button>
        </div>

        {/* New meeting form */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-xl border border-indigo-200 p-5 mb-6">
            <h2 className="font-semibold text-gray-800 mb-4">📋 会議相談を作成</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">会議タイトル *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} className={fieldClass} placeholder="例: Q2振り返りMTG" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">参加メンバー *</label>
                <div className="flex flex-wrap gap-2">
                  {(members ?? []).map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMember(m.id)}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                        selectedIds.includes(m.id)
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
                {(members ?? []).length === 0 && (
                  <p className="text-sm text-gray-400">まずメンバーを登録してください</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">アジェンダ・目的 *</label>
                <textarea value={agenda} onChange={e => setAgenda(e.target.value)} className={`${fieldClass} h-20 resize-none`} placeholder="この会議で決めたいこと、話したいこと..." required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">懸念点（任意）</label>
                <textarea value={concerns} onChange={e => setConcerns(e.target.value)} className={`${fieldClass} h-16 resize-none`} placeholder="地雷になりそうなこと、難しそうな点..." />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3">
                <button type="submit" disabled={creating || !title || selectedIds.length === 0 || !agenda}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-2.5 rounded-lg transition-colors">
                  {creating ? '🔄 AIがアドバイス中...' : '✨ アドバイスをもらう'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  キャンセル
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Meeting list */}
        {(!meetings || meetings.length === 0) ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p>まだ会議相談がありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map(meeting => {
              const participants = (members ?? []).filter(m => meeting.participantIds.includes(m.id));
              return (
                <Link
                  key={meeting.id}
                  to={`/meetings/${meeting.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-indigo-200 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{meeting.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{meeting.agenda}</p>
                      <div className="flex gap-1 mt-2">
                        {participants.map(p => (
                          <span key={p.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.name}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      {meeting.reflection?.rating && (
                        <span className="text-lg">{meeting.reflection.rating}</span>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(meeting.createdAt).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
