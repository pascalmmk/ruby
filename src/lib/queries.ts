import { decode } from 'base64-arraybuffer';

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

// ---- Sharing ---------------------------------------------------------------

export type Member = {
  user_id: string;
  role: string;
  display_name: string;
  avatar_url: string | null;
};

export type ShareResult = 'added' | 'not_found' | 'self';

export async function shareList(listId: string, email: string): Promise<ShareResult> {
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
