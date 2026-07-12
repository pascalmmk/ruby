import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/lib/auth';
import { fetchProfile, type Profile } from '@/lib/queries';

type ProfileContextValue = {
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setProfile: (p: Profile | null) => void;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session) {
      setProfile(null);
      return;
    }
    try {
      setProfile(await fetchProfile(session.user.id));
    } catch (err) {
      console.warn('Failed to load profile', err);
    }
  }, [session]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    refresh().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  return (
    <ProfileContext.Provider value={{ profile, loading, refresh, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
