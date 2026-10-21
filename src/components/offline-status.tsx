import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform, Text, View } from 'react-native';
import { offlineStatus, subscribeOffline, syncOffline } from '@/lib/offline';
import { supabase } from '@/lib/supabase';

export function OfflineStatus() {
  const status = useSyncExternalStore(subscribeOffline, offlineStatus, offlineStatus);
  useEffect(() => {
    void syncOffline();
    const timer = setInterval(() => void syncOffline(), 15000);
    const app = AppState.addEventListener('change', (state) => { if (state === 'active') void syncOffline(); });
    const channel = supabase.channel('offline-refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists' }, () => void syncOffline())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => void syncOffline())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'list_members' }, () => void syncOffline())
      .subscribe();
    const online = () => void syncOffline();
    if (Platform.OS === 'web') window.addEventListener('online', online);
    return () => { clearInterval(timer); app.remove(); void supabase.removeChannel(channel); if (Platform.OS === 'web') window.removeEventListener('online', online); };
  }, []);
  return status ? <View style={{ backgroundColor: '#fff0ce', padding: 8 }}><Text accessibilityLiveRegion="polite" style={{ color: '#513b00', textAlign: 'center' }}>{status}</Text></View> : null;
}
