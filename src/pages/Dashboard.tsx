import { Link } from 'react-router-dom';
import { useMembers } from '../db/hooks';
import { useSelfProfile } from '../db/hooks';

export default function Dashboard() {
  const members = useMembers();
  const selfProfile = useSelfProfile();

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">ダッシュボード</h1>

        {/* Self profile warning */}
        {!selfProfile && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-800">自己プロファイルが未登録です</p>
              <p className="text-sm text-amber-700 mt-0.5">バイアス補正を有効にするには自己プロファイルを登録してください。</p>
              <Link
                to="/profile/self"
                className="inline-block mt-2 text-sm font-medium text-amber-800 underline hover:no-underline"
              >
                登録する →
              </Link>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">登録メンバー</p>
            <p className="text-3xl font-bold text-indigo-600 mt-1">{members?.length ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">自己プロファイル</p>
            <p className="text-lg font-medium text-gray-900 mt-1">
              {selfProfile ? `${selfProfile.mbti.label}（${selfProfile.mbti.type}）` : '未設定'}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">エニアグラム</p>
            <p className="text-lg font-medium text-gray-900 mt-1">
              {selfProfile ? `タイプ${selfProfile.enneagram.type}` : '未設定'}
            </p>
          </div>
        </div>

        {/* Members */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">メンバー一覧</h2>
          <Link
            to="/members/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            ＋ メンバーを追加
          </Link>
        </div>

        {!members || members.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-gray-500">まだメンバーが登録されていません</p>
            <Link
              to="/members/new"
              className="inline-block mt-4 text-sm font-medium text-indigo-600 hover:underline"
            >
              最初のメンバーを追加する
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map(member => (
              <Link
                key={member.id}
                to={`/members/${member.id}`}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-indigo-200 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-600">
                    {member.name[0]}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    member.inputMode === 'ai' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {member.inputMode === 'ai' ? 'AI分析' : '手動'}
                  </span>
                </div>
                <h3 className="font-medium text-gray-900 group-hover:text-indigo-700">{member.name}</h3>
                {member.role && <p className="text-xs text-gray-500 mt-0.5">{member.role}</p>}
                <div className="mt-2 flex flex-wrap gap-1">
                  {member.relationship && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {member.relationship}
                    </span>
                  )}
                  {(member.mbti?.type || member.aiInferred?.mbti?.type) && (
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                      {member.aiInferred?.mbti?.type || member.mbti?.type}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
