import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/dashboard', icon: '🏠', label: 'ホーム' },
  { to: '/profile/self', icon: '👤', label: '自己プロファイル' },
  { to: '/members/new', icon: '➕', label: 'メンバー追加' },
  { to: '/network', icon: '🕸️', label: 'ネットワーク' },
  { to: '/meetings', icon: '📋', label: '会議相談' },
  { to: '/chat', icon: '💬', label: 'AIコーチ' },
];

export default function Layout() {
  const { logout } = useAuth();

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar - 固定 */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-screen sticky top-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌙</span>
            <span className="font-bold text-gray-900">HitodukiAI</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <span>⚙️</span>
            <span>設定</span>
          </NavLink>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors mt-1"
          >
            <span>🚪</span>
            <span>ログアウト</span>
          </button>
        </div>
      </aside>

      {/* Main content - 独立スクロール */}
      <main className="flex-1 overflow-y-auto h-screen">
        <Outlet />
      </main>
    </div>
  );
}
