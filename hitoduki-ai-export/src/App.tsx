import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SelfProfile from './pages/SelfProfile';
import MemberNew from './pages/MemberNew';
import MemberDetail from './pages/MemberDetail';
import Network from './pages/Network';
import Meetings from './pages/Meetings';
import MeetingDetail from './pages/MeetingDetail';
import MeetingReflection from './pages/MeetingReflection';
import Chat from './pages/Chat';
import Settings from './pages/Settings';

function ProtectedRoutes() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile/self" element={<SelfProfile />} />
        <Route path="/members/new" element={<MemberNew />} />
        <Route path="/members/:id" element={<MemberDetail />} />
        <Route path="/network" element={<Network />} />
        <Route path="/meetings" element={<Meetings />} />
        <Route path="/meetings/:id" element={<MeetingDetail />} />
        <Route path="/meetings/:id/reflection" element={<MeetingReflection />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
