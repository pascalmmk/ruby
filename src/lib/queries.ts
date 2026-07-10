import { supabase } from '@/lib/supabase';
import type { Item, List } from '@/lib/types';

// ---- Lists -----------------------------------------------------------------

export async function fetchLists(): Promise<List[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchList(id: string): Promise<List | null> {
  const { data, error } = await supabase.from('lists').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createList(name: string, emoji: string, ownerId: string): Promise<List> {
  // Insert without RETURNING, then read the row back in a separate request. A
  // combined insert().select() can trip the lists SELECT policy on the freshly
  // inserted row inside the same statement; two steps sidesteps that entirely.
  const { error } = await supabase.from('lists').insert({ name, emoji, owner_id: ownerId });
  if (error) throw error;

  const { data, error: selectError } = await supabase
    .from('lists')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('name', name)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (selectError) throw selectError;
  return data;
}

export async function deleteList(id: string): Promise<void> {
  const { error } = await supabase.from('lists').delete().eq('id', id);
  if (error) throw error;
}

// ---- Items -----------------------------------------------------------------

export async function fetchItems(listId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('list_id', listId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addItem(listId: string, text: string, userId: string): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .insert({ list_id: listId, text, created_by: userId, position: Date.now() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleItem(item: Item, userId: string): Promise<void> {
  const nextDone = !item.is_done;
  const { error } = await supabase
    .from('items')
    .update({ is_done: nextDone, done_by: nextDone ? userId : null })
    .eq('id', item.id);
  if (error) throw error;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw error;
}
