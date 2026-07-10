import { useCallback, useEffect, useState } from 'react';

import { fetchLists } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import type { List } from '@/lib/types';

/**
 * Loads the current user's lists and keeps them fresh: any insert/update/delete
 * on the lists table (from this device or another) triggers a refetch.
 */
export function useLists() {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLists(await fetchLists());
    } catch (err) {
      console.warn('Failed to load lists', err);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));

    const channel = supabase
      .channel('lists-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists' }, () => {
        refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'list_members' }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { lists, loading, refresh };
}
