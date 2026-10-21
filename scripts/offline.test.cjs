const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ts = require('typescript');
function setup() {
  const disk = new Map();
  const rows = { lists: [], items: [] };
  let down = true;
  let loseResponse = false;
  const supabase = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'alice' } } } }) },
    from(table) {
      let mode = 'select', values, id;
      const query = {
        insert(v) { mode = 'insert'; values = v; return query; },
        update(v) { mode = 'update'; values = v; return query; },
        delete() { mode = 'delete'; return query; },
        eq(_, v) { id = v; return query; },
        select() { return query; }, order() { return query; }, range() { return query; },
        async abortSignal() {
          if (down) return { error: { message: 'Failed to fetch' } };
          if (mode === 'insert') {
            if (rows[table].some(r => r.id === values.id)) return { error: { code: '23505' } };
            rows[table].push({ ...values });
            if (loseResponse) { loseResponse = false; return { error: { message: 'Lost response' } }; }
          }
          if (mode === 'update') rows[table] = rows[table].map(r => r.id === id ? { ...r, ...values } : r);
          if (mode === 'delete') rows[table] = rows[table].filter(r => r.id !== id);
          return { data: [...rows[table]], error: null };
        },
      };
      return query;
    },
  };
  const storage = { getItem: async k => disk.get(k) ?? null, setItem: async (k, v) => disk.set(k, v) };
  function load() {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync('src/lib/offline.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, { exports, require: name => name.includes('async-storage') ? storage : { supabase }, AbortSignal, AbortController, setTimeout, clearTimeout, console });
    return exports;
  }
  return { load, supabase, rows, online: () => { down = false; }, lose: () => { loseResponse = true; } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
test('offline writes survive restart and remain isolated by account', async () => {
  const env = setup(); let store = env.load();
  await store.openOffline('alice');
  await store.localChange({ table: 'lists', kind: 'insert', id: 'l1', values: { id: 'l1', name: 'Groceries' } });
  await settle();
  store = env.load(); await store.openOffline('alice');
  assert.equal(store.offlineSnapshot().lists[0].name, 'Groceries');
  assert.equal(store.offlineSnapshot().pending.length, 1);
  await store.openOffline('bob'); assert.equal(store.offlineSnapshot().lists.length, 0);
  await store.openOffline('alice'); env.online(); await store.syncOffline();
  assert.equal(store.offlineSnapshot().pending.length, 0);
  assert.equal(env.rows.lists.length, 1);
});
test('lost create response retries without duplicates and replays later changes', async () => {
  const env = setup(); const store = env.load(); await store.openOffline('alice');
  await store.localChange({ table: 'items', kind: 'insert', id: 'i1', values: { id: 'i1', is_done: false } });
  await settle();
  await store.localChange({ table: 'items', kind: 'update', id: 'i1', values: { is_done: true } });
  await settle(); env.online(); env.lose(); await store.syncOffline();
  assert.equal(store.offlineSnapshot().pending.length, 2);
  await store.syncOffline();
  assert.equal(env.rows.items.length, 1); assert.equal(env.rows.items[0].is_done, true);
  assert.equal(store.offlineSnapshot().pending.length, 0);
});



function loadQueries(store, supabase) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/lib/queries.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => name === './offline' ? store : name.includes('supabase') ? { supabase } : require(name), console });
  return exports;
}
test('frontend queries create, complete, reopen and delete items, then remove a list', async () => {
  const env = setup(), store = env.load();
  await store.openOffline('alice');
  const queries = loadQueries(store, env.supabase);
  const list = await queries.createList('Groceries', '🛒', 'alice');
  assert.equal((await queries.fetchLists())[0].id, list.id);
  const item = await queries.addItem(list.id, 'Fresh fruit', 'alice');
  assert.equal((await queries.fetchItems(list.id)).length, 1);
  await queries.toggleItem(item, 'alice');
  assert.equal((await queries.fetchItems(list.id))[0].is_done, true);
  await queries.toggleItem((await queries.fetchItems(list.id))[0], 'alice');
  assert.equal((await queries.fetchItems(list.id))[0].is_done, false);
  await settle(); env.online(); await store.syncOffline();
  assert.equal(env.rows.lists[0].id, list.id);
  assert.equal(env.rows.items[0].is_done, false);
  await queries.deleteItem(item.id); await settle(); await store.syncOffline();
  assert.equal(env.rows.items.length, 0);
  await queries.deleteList(list.id); await settle(); await store.syncOffline();
  assert.equal((await queries.fetchLists()).length, 0);
  assert.equal(env.rows.lists.length, 0);
});
test('frontend blocks adding to unavailable lists and sharing an unsynced list', async () => {
  const env = setup(), store = env.load();
  await store.openOffline('alice');
  const queries = loadQueries(store, env.supabase);
  await assert.rejects(queries.addItem('missing', 'Item', 'alice'), /not available/);
  const list = await queries.createList('Offline list', '📝', 'alice');
  await settle();
  await assert.rejects(queries.shareList(list.id, 'friend@example.invalid'), /Wait for it to sync/);
  assert.equal(store.offlineSnapshot().pending.length, 1);
});
