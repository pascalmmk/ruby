import { useEffect, useState } from 'react';

import { fetchItems } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import type { Item } from '@/lib/types';

function sortItems(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return a.created_at.localeCompare(b.created_at);
  });
}

/**
 * Loads a single list's items and applies live row changes as they arrive over
 * Supabase Realtime. This is what makes two devices stay in sync instantly.
 */
export function useItems(listId: string) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchItems(listId)
      .then((data) => {
        if (active) setItems(sortItems(data));
      })
      .catch((err) => console.warn('Failed to load items', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    // NOTE: we intentionally do NOT use a server-side `filter: list_id=eq.X`.
    // DELETE events only carry the primary key in `payload.old` (unless the
    // table is set to REPLICA IDENTITY FULL), so a server-side list_id filter
    // can never match a delete and those events get dropped. Instead we receive
    // all item changes the user is allowed to see (RLS still applies) and filter
    // by list_id here on the client.
    const channel = supabase
      .channel(`items:${listId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === 'INSERT') {
              const next = payload.new as Item;
              if (next.list_id !== listId) return prev;
              if (prev.some((i) => i.id === next.id)) return prev;
              return sortItems([...prev, next]);
            }
            if (payload.eventType === 'UPDATE') {
              const next = payload.new as Item;
              if (next.list_id !== listId) return prev;
              return sortItems(prev.map((i) => (i.id === next.id ? next : i)));
            }
            if (payload.eventType === 'DELETE') {
              const gone = payload.old as Partial<Item>;
              return prev.filter((i) => i.id !== gone.id);
            }
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [listId]);

  return { items, loading };
}
