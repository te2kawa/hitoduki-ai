import { useParams, Link } from 'react-router-dom';
import { useMeeting, useMembers } from '../db/hooks';

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const meeting = useMeeting(id!);
  const members = useMembers();

  if (!meeting) return <div className="p-6 text-gray-500">会議が見つかりません</div>;

  const participants = (members ?? []).filter(m => meeting.participantIds.includes(m.id));
  const advice = meeting.adviceResult;

  const getMemberName = (memberId: string) =>
    participants.find(p => p.id === memberId)?.name ?? memberId;

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{new Date(meeting.createdAt).toLocaleDateString('ja-JP')}</p>
          </div>
          <Link
            to={`/meetings/${id}/reflection`}
            className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            📝 振り返り
          </Link>
        </div>

        {/* Meeting info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">📋 会議情報</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">アジェンダ: </span>
              <span className="text-gray-900">{meeting.agenda}</span>
            </div>
            {meeting.concerns && (
              <div>
                <span className="text-gray-500">懸念点: </span>
                <span className="text-gray-900">{meeting.concerns}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">参加者: </span>
              {participants.map(p => (
                <span key={p.id} className="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs mr-1">{p.name}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Advice */}
        {advice && (
          <div className="space-y-4">
            {/* Pre-meeting advice */}
            {advice.pre_meeting_advice?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-800 mb-3">🤝 事前根回しアドバイス</h2>
                <div className="space-y-3">
                  {advice.pre_meeting_advice.map((item, i) => (
                    <div key={i} className="bg-indigo-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-indigo-700 mb-1">
                        {getMemberName(item.member_id)} へ
                      </p>
                      <p className="text-sm text-gray-700">{item.advice}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Facilitation */}
            {advice.facilitation && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-800 mb-3">🎯 会議進行アドバイス</h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{advice.facilitation}</p>
              </div>
            )}

            {/* Keywords */}
            {advice.keywords && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-800 mb-3">💬 キーワード</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-red-700 mb-2">⚠️ 地雷ワード（避ける）</h3>
                    <div className="flex flex-wrap gap-1">
                      {advice.keywords.landmines?.map((w, i) => (
                        <span key={i} className="bg-red-50 text-red-700 text-xs px-2 py-1 rounded-full">{w}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-green-700 mb-2">✨ 刺さるキーワード</h3>
                    <div className="flex flex-wrap gap-1">
                      {advice.keywords.hooks?.map((w, i) => (
                        <span key={i} className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full">{w}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Closing */}
            {advice.closing && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-800 mb-3">🏁 クロージング提案</h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{advice.closing}</p>
              </div>
            )}
          </div>
        )}

        {/* Reflection summary */}
        {meeting.reflection?.memo && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="font-semibold text-amber-800">📝 振り返り</h2>
              {meeting.reflection.rating && (
                <span className="text-2xl">{meeting.reflection.rating}</span>
              )}
            </div>
            <p className="text-sm text-amber-700">{meeting.reflection.memo}</p>
          </div>
        )}
      </div>
    </div>
  );
}
