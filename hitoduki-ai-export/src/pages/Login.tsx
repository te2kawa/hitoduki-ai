import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login, hasPassword, setupPassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!hasPassword) {
        if (password !== confirmPassword) {
          setError('パスワードが一致しません');
          return;
        }
        if (password.length < 4) {
          setError('パスワードは4文字以上で設定してください');
          return;
        }
        await setupPassword(password);
        navigate('/dashboard');
      } else {
        const ok = await login(password);
        if (ok) {
          navigate('/dashboard');
        } else {
          setError('パスワードが違います');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
            <span className="text-3xl">🌙</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">HitodukiAI</h1>
          <p className="text-sm text-gray-500 mt-1">チームの人間関係を整理するアシスタント</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!hasPassword && (
            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
              初回起動です。アクセスパスワードを設定してください。
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {hasPassword ? 'パスワード' : '新しいパスワード'}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="パスワードを入力"
              required
              autoFocus
            />
          </div>

          {!hasPassword && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パスワード（確認）
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="パスワードを再入力"
                required
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? '処理中...' : hasPassword ? 'ログイン' : 'パスワードを設定してはじめる'}
          </button>
        </form>
      </div>
    </div>
  );
}
