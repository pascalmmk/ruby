import { useSyncExternalStore } from 'react';
import { offlineSnapshot, subscribeOffline } from '@/lib/offline';
export function useItems(listId: string) {
  const state = useSyncExternalStore(subscribeOffline, offlineSnapshot, offlineSnapshot);
  return { items: state.items.filter((i) => i.list_id === listId).sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)), loading: false };
}
