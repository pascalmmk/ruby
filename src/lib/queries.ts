import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import type { Item, List } from '@/lib/types';
import { localChange, localId, offlineSnapshot, syncOffline } from './offline';

export async function fetchLists(): Promise<List[]> { return offlineSnapshot().lists; }
export async function fetchList(id: string): Promise<List | null> { return offlineSnapshot().lists.find((r) => r.id === id) ?? null; }
export async function fetchItems(listId: string): Promise<Item[]> { return offlineSnapshot().items.filter((r) => r.list_id === listId); }
export async function createList(name: string, emoji: string, ownerId: string): Promise<List> {
  const row: List = { id: localId(), name, emoji, owner_id: ownerId, created_at: new Date().toISOString() };
  await localChange({ table: 'lists', kind: 'insert', id: row.id, values: row });
  return row;
}
export async function deleteList(id: string): Promise<void> { await localChange({ table: 'lists', kind: 'delete', id }); }
export async function addItem(listId: string, text: string, userId: string): Promise<Item> {
  if (!offlineSnapshot().lists.some((list) => list.id === listId)) throw new Error('This list is not available on this device.');
  if (!text.trim()) throw new Error('Enter an item first.');
  const row: Item = { id: localId(), list_id: listId, text, created_by: userId, position: Date.now(), is_done: false, done_by: null, created_at: new Date().toISOString() };
  await localChange({ table: 'items', kind: 'insert', id: row.id, values: row });
  return row;
}
export async function toggleItem(item: Item, userId: string): Promise<void> {
  await localChange({ table: 'items', kind: 'update', id: item.id, values: { is_done: !item.is_done, done_by: !item.is_done ? userId : null } });
}
export async function deleteItem(id: string): Promise<void> { await localChange({ table: 'items', kind: 'delete', id }); }
// ---- Sharing ---------------------------------------------------------------

export type Member = {
  user_id: string;
  role: string;
  display_name: string;
  avatar_url: string | null;
};

export type ShareResult = 'added' | 'not_found' | 'self';

export async function shareList(listId: string, email: string): Promise<ShareResult> {
  await syncOffline();
  if (offlineSnapshot().pending.some((op) => op.table === 'lists' && op.id === listId)) {
    throw new Error('This list is saved on your device. Wait for it to sync before inviting someone.');
  }
  const { data, error } = await supabase.rpc('add_list_member', {
    _list_id: listId,
    _email: email,
  });
  if (error) throw error;
  return (data as ShareResult) ?? 'added';
}

export async function fetchMembers(listId: string): Promise<Member[]> {
  const { data: members, error } = await supabase
    .from('list_members')
    .select('user_id, role')
    .eq('list_id', listId);
  if (error) throw error;

  const ids = (members ?? []).map((m) => m.user_id);
  if (ids.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', ids);
  if (profileError) throw profileError;

  return (members ?? []).map((m) => {
    const p = profiles?.find((x) => x.id === m.user_id);
    return {
      user_id: m.user_id,
      role: m.role,
      display_name: p?.display_name ?? 'Someone',
      avatar_url: p?.avatar_url ?? null,
    };
  });
}

// ---- Profile ---------------------------------------------------------------

export type Profile = { id: string; display_name: string | null; avatar_url: string | null };

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(
  userId: string,
  fields: { display_name?: string; avatar_url?: string },
): Promise<void> {
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId);
  if (error) throw error;
}

/** Upload an avatar (from image-picker base64) to Storage and return its public URL. */
export async function uploadAvatar(
  userId: string,
  base64: string,
  contentType = 'image/jpeg',
): Promise<string> {
  const ext = (contentType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, decode(base64), { contentType, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // cache-buster so the new image shows immediately
  return `${data.publicUrl}?v=${Date.now()}`;
}
