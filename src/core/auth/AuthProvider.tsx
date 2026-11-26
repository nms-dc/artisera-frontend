'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { clearLoggedOut, clearSession, getStoredUser, markLoggedOut, setSession, SessionUser } from './session';
import { axiosClient } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import { apiSlice } from '@/store/apiSlice';
import { store } from '@/store/store';
import type { PermissionAction, PermissionModule } from '@/lib/types';

type AuthContextValue = {
  user: SessionUser | null;
  ready: boolean;
  login: (user: SessionUser) => void;
  logout: () => Promise<void>;
  can: (module: PermissionModule, action: PermissionAction) => boolean;
};

export const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [ready, setReady] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let me: SessionUser;
        if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
          const { mockDispatch } = await import('@/mocks/server');
          me = await mockDispatch({ url: endpoints.auth.me, method: 'GET' });
        } else {
          me = (await axiosClient.get(endpoints.auth.me)).data;
        }
        if (!cancelled) {
          setSession(me);
          setUser(me);
        }
      } catch {
        if (!cancelled) {
          clearSession();
          setUser(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    setUser(getStoredUser());
    return () => {
      cancelled = true;
    };
  }, []);

  const login = React.useCallback((u: SessionUser) => {
    store.dispatch(apiSlice.util.resetApiState());
    clearLoggedOut();
    setSession(u);
    setUser(u);
  }, []);

  const logout = React.useCallback(async () => {
    try {
      if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
        const { mockDispatch } = await import('@/mocks/server');
        await mockDispatch({ url: endpoints.auth.logout, method: 'POST' });
      } else {
        await axiosClient.post(endpoints.auth.logout);
      }
    } catch {}
    store.dispatch(apiSlice.util.resetApiState());
    clearSession();
    markLoggedOut();
    setUser(null);
    router.push('/login');
  }, [router]);

  const can = React.useCallback((m: PermissionModule, a: PermissionAction) => Boolean(user?.permissions?.[m]?.[a]), [user]);

  return <AuthContext.Provider value={{ user, ready, login, logout, can }}>{children}</AuthContext.Provider>;
}
