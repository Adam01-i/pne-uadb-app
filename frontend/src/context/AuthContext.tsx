'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { User } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      let res = await fetch(`${API_URL}/api/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        // Tenter le rafraîchissement du token
        const refresh = localStorage.getItem('refresh_token');
        if (refresh) {
          const refreshRes = await fetch(`${API_URL}/api/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh }),
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem('access_token', data.access);
            res = await fetch(`${API_URL}/api/me/`, {
              headers: { Authorization: `Bearer ${data.access}` },
            });
          } else {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setLoading(false);
            return;
          }
        }
      }

      if (res.ok) {
        const userData: User = await res.json();
        setUser(userData);
      }
    } catch {
      // erreur réseau — ignorer silencieusement
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  async function login(username: string, password: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.detail || 'Identifiants incorrects. Vérifiez votre email et mot de passe.'
      );
    }

    const tokens = await res.json();
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);

    // Charger les infos utilisateur
    const meRes = await fetch(`${API_URL}/api/me/`, {
      headers: { Authorization: `Bearer ${tokens.access}` },
    });
    if (meRes.ok) {
      setUser(await meRes.json());
    }
  }

  function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
