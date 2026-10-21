import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { Item, List } from './types';

type Operation = { table: 'lists' | 'items'; kind: 'insert' | 'update' | 'delete'; id: string; values?: Record<string, unknown> };
type Snapshot = { lists: List[]; items: Item[]; pending: Operation[] };
const empty = (): Snapshot => ({ lists: [], items: [], pending: [] });
let user: string | null = null;
let state = empty();
let serial: Promise<unknown> = Promise.resolve();
let syncing = false;
let message = 'Loading saved lists…';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());
export const subscribeOffline = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const offlineSnapshot = () => state;
export const offlineStatus = () => message;
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const result = serial.then(fn);
  serial = result.catch(() => {});
  return result;
}
async function save(next: Snapshot) {
  if (!user) throw new Error('Sign in before editing lists.');
  await AsyncStorage.setItem(`ruby.offline.v1:${user}`, JSON.stringify(next));
  state = next;
  emit();
}
export function openOffline(account: string | null) {
  return locked(async () => {
    if (user === account) return;
    user = account;
    state = empty();
    emit();
    if (account) {
      const saved = await AsyncStorage.getItem(`ruby.offline.v1:${account}`);
      if (saved) state = JSON.parse(saved);
    }
    message = state.pending.length ? `${state.pending.length} changes saved on this device; waiting to sync` : 'Saved lists available offline';
    emit();
  });
}
export async function localChange(op: Operation) {
  await locked(async () => {
    const next = { ...state, lists: [...state.lists], items: [...state.items], pending: [...state.pending, op] };
    apply(next, op);
    await save(next);
    message = `${next.pending.length} changes saved on this device; waiting to sync`;
    emit();
  });
  void syncOffline();
}
function apply(target: Snapshot, op: Operation) {
  if (op.table === 'lists') {
    if (op.kind === 'insert' && !target.lists.some((r) => r.id === op.id)) target.lists.push(op.values as List);
    if (op.kind === 'delete') {
      target.lists = target.lists.filter((r) => r.id !== op.id);
      target.items = target.items.filter((r) => r.list_id !== op.id);
    }
  } else {
    if (op.kind === 'insert' && !target.items.some((r) => r.id === op.id)) target.items.push(op.values as Item);
    if (op.kind === 'update') target.items = target.items.map((r) => r.id === op.id ? { ...r, ...op.values } : r);
    if (op.kind === 'delete') target.items = target.items.filter((r) => r.id !== op.id);
  }
}
function requestTimeout() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}
async function readAll(table: 'lists' | 'items') {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const timeout = requestTimeout();
    const result = await Promise.resolve(supabase.from(table).select('*').order('id').range(offset, offset + 499).abortSignal(timeout.signal)).finally(timeout.clear);
    if (result.error) throw result.error;
    rows.push(...result.data);
    if (result.data.length < 500) return rows;
  }
}
export async function syncOffline() {
  if (syncing || !user) return;
  syncing = true;
  const account = user;
  try {
    // Refresh credentials before replay; offline reads never wait for this request.
    const { data: auth, error: authError } = await supabase.auth.getSession();
    if (authError) throw authError;
    if (auth.session?.user.id !== account) throw new Error('Sign in again to sync saved changes.');
    while (user === account && state.pending.length) {
      const op = state.pending[0];
      const query = supabase.from(op.table);
      const timeout = requestTimeout();
      const result = await (async () => op.kind === 'insert'
        ? await query.insert(op.values!).abortSignal(timeout.signal)
        : op.kind === 'update'
          ? await query.update(op.values!).eq('id', op.id).select('id').abortSignal(timeout.signal)
          : await query.delete().eq('id', op.id).abortSignal(timeout.signal))().finally(timeout.clear);
      // A lost response can replay an insert: a matching UUID is already committed.
      if (result.error && !(op.kind === 'insert' && result.error.code === '23505')) throw result.error;
      if (op.kind === 'update' && !result.error && !result.data?.length) throw new Error('An item was removed or access changed. Saved edits need review.');
      await locked(async () => {
        if (user === account) await save({ ...state, pending: state.pending.filter((p) => p !== op) });
      });
    }
    const lists = await readAll('lists');
    const items = await readAll('items');
    await locked(async () => {
      if (user !== account) return;
      const next: Snapshot = { lists: lists.sort((a, b) => b.created_at.localeCompare(a.created_at)), items, pending: state.pending };
      next.pending.forEach((op) => apply(next, op));
      await save(next);
      message = next.pending.length ? 'Changes saved; sync pending' : '';
      emit();
    });
  } catch (error) {
    if (user === account) {
      const detail = error as { code?: string; message?: string };
      message = detail.code && !detail.code.startsWith('08')
        ? `Sync needs attention: ${detail.message}. Edits remain saved on this device.`
        : `Server unavailable. ${state.pending.length ? `${state.pending.length} changes saved; will retry` : 'Using saved lists'}.`;
      emit();
    }
  } finally { syncing = false; }
}
// UUIDs are assigned once, so retrying a create cannot create duplicate rows.
export function localId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}
