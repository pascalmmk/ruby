import { useSyncExternalStore } from 'react';
import { offlineSnapshot, subscribeOffline, syncOffline } from '@/lib/offline';
export function useLists() {
  const state = useSyncExternalStore(subscribeOffline, offlineSnapshot, offlineSnapshot);
  return { lists: state.lists, loading: false, refresh: syncOffline };
}
