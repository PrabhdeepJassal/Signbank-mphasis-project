/**
 * AuthContext — stores current user + JWT token in localStorage.
 *
 * FIX: currentUser is now rehydrated from localStorage on every page load/refresh.
 * Previously, token was restored but currentUser was always null → ProtectedRoute
 * redirected everyone to "/" on refresh. Now both are restored together.
 */
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── Rehydrate user from localStorage (called once at startup) ─────────────────
function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return null;
    const user = JSON.parse(raw) as User;
    // Basic sanity check
    if (!user.userId || !user.roleName) return null;
    return user;
  } catch {
    return null;
  }
}

function loadStoredToken(): string | null {
  return localStorage.getItem('auth_token');
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Both are initialised from localStorage so a refresh doesn't wipe the session
  const [currentUser, setCurrentUser] = useState<User | null>(loadStoredUser);
  const [token, setToken] = useState<string | null>(loadStoredToken);

  const login = (user: User, tok: string) => {
    // Persist both so refresh works
    localStorage.setItem('auth_token', tok);
    localStorage.setItem('auth_user', JSON.stringify(user));
    setToken(tok);
    setCurrentUser(user);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};