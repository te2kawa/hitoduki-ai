import React, { createContext, useContext, useState, useEffect } from 'react';

const AUTH_KEY = 'hitoduki_auth';
const HASH_KEY = 'hitoduki_pw_hash';

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

interface AuthContextType {
  isAuthenticated: boolean;
  hasPassword: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  setPassword: (oldPw: string, newPw: string) => Promise<boolean>;
  setupPassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem(AUTH_KEY);
    const hash = localStorage.getItem(HASH_KEY);
    setIsAuthenticated(auth === 'true');
    setHasPassword(!!hash);
  }, []);

  async function setupPassword(password: string) {
    const hash = await sha256(password);
    localStorage.setItem(HASH_KEY, hash);
    localStorage.setItem(AUTH_KEY, 'true');
    setHasPassword(true);
    setIsAuthenticated(true);
  }

  async function login(password: string): Promise<boolean> {
    const storedHash = localStorage.getItem(HASH_KEY);
    if (!storedHash) return false;
    const hash = await sha256(password);
    if (hash === storedHash) {
      localStorage.setItem(AUTH_KEY, 'true');
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }

  function logout() {
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
  }

  async function setPassword(oldPw: string, newPw: string): Promise<boolean> {
    const storedHash = localStorage.getItem(HASH_KEY);
    if (!storedHash) return false;
    const oldHash = await sha256(oldPw);
    if (oldHash !== storedHash) return false;
    const newHash = await sha256(newPw);
    localStorage.setItem(HASH_KEY, newHash);
    return true;
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, hasPassword, login, logout, setPassword, setupPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
