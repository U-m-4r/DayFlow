/**
 * Auth context — restores the active user from localStorage,
 * exposes login/logout, and tracks mustChangePassword state.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

export type User = {
  id: string;
  email: string;
  loginId: string;
  role: 'ADMIN' | 'EMPLOYEE';
  mustChangePassword: boolean;
  fullName?: string;
  companyName?: string;
  companyLogo?: string | null;
  profilePicture?: string | null;
};

type AuthContext = {
  user: User | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
};

const Ctx = createContext<AuthContext>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() =>
    JSON.parse(localStorage.getItem('dayflow_user') || 'null')
  );

  useEffect(() => {
    if (!user) {
      localStorage.removeItem('dayflow_access');
      localStorage.removeItem('dayflow_refresh');
      localStorage.removeItem('dayflow_user');
    }
  }, [user]);

  const login = async (identifier: string, password: string) => {
    const { data } = await api.post('/auth/signin', { identifier, password });
    localStorage.setItem('dayflow_access', data.accessToken);
    localStorage.setItem('dayflow_refresh', data.refreshToken);
    localStorage.setItem('dayflow_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('dayflow_access');
    localStorage.removeItem('dayflow_refresh');
    localStorage.removeItem('dayflow_user');
    setUser(null);
  };

  const updateUser = (partial: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      localStorage.setItem('dayflow_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <Ctx.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
