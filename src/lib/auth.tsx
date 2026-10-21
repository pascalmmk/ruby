import AsyncStorage from '@react-native-async-storage/async-storage';
import { openOffline } from './offline';
import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let revision = 0;
    async function apply(next: Session | null) {
      const current = ++revision;
      await openOffline(next?.user.id ?? null);
      if (active && current === revision) {
        setSession(next);
        setLoading(false);
      }
    }
    // Read the SDK's persisted session without waiting for token refresh during an outage.
    const key = `sb-${new URL(process.env.EXPO_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]}-auth-token`;
    const initialRevision = revision;
    AsyncStorage.getItem(key).then((saved) => {
      if (active && revision === initialRevision) return apply(saved ? JSON.parse(saved) : null);
    }).catch(() => { if (active) setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      // Defer work outside Supabase's auth lock.
      setTimeout(() => { if (active) void apply(next).catch(console.warn); }, 0);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      signUp: async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error) throw error;
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
