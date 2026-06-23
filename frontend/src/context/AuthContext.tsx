import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthModalGate } from '../components/AuthModal';
import {
  clearSession,
  getUser,
  isLoggedIn,
  login as apiLogin,
  onAuthChange,
  setAuthRequiredHandler,
  signup as apiSignup,
} from '../lib/api';

type AuthContextValue = {
  loggedIn: boolean;
  user: { userId: number; email: string } | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  requireLogin: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [user, setUser] = useState(getUser());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authResolver, setAuthResolver] = useState<((ok: boolean) => void) | null>(null);

  useEffect(() => onAuthChange(() => {
    setLoggedIn(isLoggedIn());
    setUser(getUser());
  }), []);

  const requireLogin = useCallback(() => {
    if (isLoggedIn()) return Promise.resolve(true);
    setAuthModalOpen(true);
    return new Promise<boolean>((resolve) => setAuthResolver(() => resolve));
  }, []);

  useEffect(() => {
    setAuthRequiredHandler(requireLogin);
  }, [requireLogin]);

  const resolveAuth = (ok: boolean) => {
    setAuthModalOpen(false);
    authResolver?.(ok);
    setAuthResolver(null);
  };

  const login = async (email: string, password: string) => {
    await apiLogin(email, password);
    resolveAuth(true);
  };

  const signup = async (name: string, email: string, password: string) => {
    await apiSignup(name, email, password);
    resolveAuth(true);
  };

  const logout = () => clearSession();

  const value = useMemo(
    () => ({ loggedIn, user, login, signup, logout, requireLogin }),
    [loggedIn, user, requireLogin],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {authModalOpen && (
        <AuthModalGate
          onClose={() => resolveAuth(false)}
          onLogin={login}
          onSignup={signup}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
