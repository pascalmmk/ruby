import { useRouter } from 'expo-router';
import { useState, useSyncExternalStore } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/avatar';
import { RubyLogo } from '@/components/ruby-logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/profile';
import { createList, deleteList, toggleItem } from '@/lib/queries';
import { offlineSnapshot, subscribeOffline } from '@/lib/offline';
import type { List } from '@/lib/types';

const EMOJIS = ['🛒', '📝', '✅', '🧳', '🎁', '🍳', '🏠', '💪'];
type TaskFilter = 'To do' | 'Completed' | 'All items';
export default function ListsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const wide = useWindowDimensions().width >= 900;
  const { session } = useAuth();
  const { profile } = useProfile();
  const { lists, items } = useSyncExternalStore(subscribeOffline, offlineSnapshot, offlineSnapshot);
  const [tab, setTab] = useState<'Overview' | 'My lists'>('Overview');
  const [filter, setFilter] = useState<TaskFilter>('To do');
  const [sharedOnly, setSharedOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [composer, setComposer] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const firstName = profile?.display_name?.trim().split(/\s+/)[0];
  const completed = items.filter(i => i.is_done).length;
  const shared = lists.filter(l => l.owner_id !== session?.user.id);
  const visibleLists = lists.filter(l => (!sharedOnly || l.owner_id !== session?.user.id) && l.name.toLowerCase().includes(search.toLowerCase()));
  const tasks = items.filter(i => lists.some(l => l.id === i.list_id) && (filter === 'All items' || (filter === 'Completed' ? i.is_done : !i.is_done)));
  const tones = [theme.tileRose, theme.tileBlush, theme.tilePeach, theme.tileBerry];
  const summaries = [
    { label: 'To do', count: items.length - completed, icon: '◷' },
    { label: 'Completed', count: completed, icon: '✓' },
    { label: 'All items', count: items.length, icon: '☷' },
    { label: 'Shared lists', count: shared.length, icon: '♧' },
  ] as const;
  async function handleCreate() {
    if (!name.trim() || !session || creating) return;
    setCreating(true); setError('');
    try {
      const list = await createList(name.trim(), emoji, session.user.id);
      setComposer(false); setName(''); router.push(`/list/${list.id}`);
    } catch { setError('Could not save your list. Please try again.'); }
    finally { setCreating(false); }
  }
  function requestDelete(list: List) {
    const remove = () => { void deleteList(list.id).catch(() => setError('Could not delete this list. Please try again.')); };
    const message = `Delete “${list.name}” and all its items for everyone?`;
    if (Platform.OS === 'web') { if (window.confirm(message)) remove(); }
    else Alert.alert('Delete list', message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: remove }]);
  }
  return (
    <ThemedView style={s.root}>
      <SafeAreaView style={s.root}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.page, wide && { paddingHorizontal: 44 }]}>
          <View style={s.header}>
            <View style={{ flex: 1, gap: 4 }}>
              {wide && <View style={s.brand}><RubyLogo size={22} /><ThemedText style={s.brandName}>ruby</ThemedText></View>}
              <ThemedText style={s.greeting}>{firstName ? `Hello ${firstName},` : 'Hello there,'}</ThemedText>
              <ThemedText themeColor="textSecondary">{items.length - completed ? `${items.length - completed} things to make room for.` : 'A little space for your next idea.'}</ThemedText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Open your profile" onPress={() => router.push('/profile')} style={s.profileButton}><Avatar name={profile?.display_name ?? session?.user.email} url={profile?.avatar_url} size={42} /></Pressable>
          </View>
          {!wide && <View style={[s.tabs, { backgroundColor: theme.backgroundSelected }]}>{(['Overview', 'My lists'] as const).map(label => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: tab === label }} onPress={() => setTab(label)} style={[s.tab, tab === label && { backgroundColor: theme.backgroundElement }]}><ThemedText type="smallBold" themeColor={tab === label ? 'accent' : 'textSecondary'}>{label}</ThemedText></Pressable>)}</View>}
          {error && !composer ? <ThemedText accessibilityRole="alert" themeColor="accent">{error}</ThemedText> : null}
          <View style={[s.columns, wide && { flexDirection: 'row', gap: 40 }]}>
            {(wide || tab === 'Overview') && <View style={[s.column, wide && { flex: 1.05 }]}>
              <View style={s.tiles}>{summaries.map((tile, index) => <Pressable key={tile.label} accessibilityRole="button" accessibilityLabel={`${tile.label}: ${tile.count}`} onPress={() => { if (tile.label === 'Shared lists') { setSharedOnly(true); setTab('My lists'); } else { setFilter(tile.label); } }} style={[s.tile, { backgroundColor: tones[index] }]}>
                <View style={[s.tileIcon, { backgroundColor: theme.tileBadge }]}><ThemedText style={s.icon}>{tile.icon}</ThemedText></View>
                <View style={s.tileBottom}><ThemedText style={s.tileLabel}>{tile.label}</ThemedText><ThemedText style={s.tileCount}>{tile.count}</ThemedText></View>
              </Pressable>)}</View>
              <View style={s.sectionHeader}><ThemedText style={s.sectionTitle}>{filter === 'To do' ? 'Your tasks' : filter}</ThemedText><ThemedText type="small" themeColor="textSecondary">{tasks.length} items</ThemedText></View>
              <View style={s.tasks}>{tasks.map(item => {
                const list = lists.find(l => l.id === item.list_id);
                return <View key={item.id} style={[s.task, { backgroundColor: theme.taskSurface }]}>
                  <Pressable accessibilityRole="checkbox" accessibilityLabel={`Complete ${item.text}`} accessibilityState={{ checked: item.is_done }} onPress={() => { if (session) void toggleItem(item, session.user.id).catch(() => setError('Could not save this change. Please try again.')); }} style={[s.checkOuter, { backgroundColor: theme.backgroundElement }]}><View style={[s.check, { borderColor: theme.accent, backgroundColor: item.is_done ? theme.accent : 'transparent' }]}>{item.is_done && <ThemedText style={{ color: theme.onAccent, fontSize: 13, lineHeight: 18 }}>✓</ThemedText>}</View></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Open ${list?.name}`} onPress={() => router.push(`/list/${item.list_id}`)} style={s.taskCopy}><ThemedText type="small" themeColor="textSecondary">{list?.emoji}  {list?.name}</ThemedText><ThemedText style={[s.taskTitle, item.is_done && { textDecorationLine: 'line-through', color: theme.textSecondary }]}>{item.text}</ThemedText></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`View ${item.text} in its list`} onPress={() => router.push(`/list/${item.list_id}`)} style={[s.more, { backgroundColor: theme.backgroundElement }]}><ThemedText themeColor="textSecondary">↗</ThemedText></Pressable>
                </View>;
              })}</View>
              {!tasks.length && <View style={[s.empty, { backgroundColor: theme.taskSurface }]}><ThemedText style={s.emptyIcon} themeColor="accent">✓</ThemedText><ThemedText style={s.sectionTitle}>{filter === 'Completed' ? 'Good things take a first step.' : 'A little breathing room.'}</ThemedText><ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>Open a list to add an item, or start a fresh list below.</ThemedText></View>}
            </View>}
            {(wide || tab === 'My lists') && <View style={[s.column, wide && { flex: 1 }]}>
              <View style={[s.sectionHeader, { marginTop: wide ? 0 : 8 }]}><ThemedText style={s.sectionTitle}>{sharedOnly ? 'Shared with you' : 'All your lists'}</ThemedText><Pressable accessibilityRole="button" onPress={() => setSharedOnly(!sharedOnly)} style={s.filterButton}><ThemedText type="small" themeColor="accent">{sharedOnly ? 'Show all' : 'Shared'}</ThemedText></Pressable></View>
              <TextInput accessibilityLabel="Search lists" value={search} onChangeText={setSearch} placeholder="Find a list…" placeholderTextColor={theme.textSecondary} style={[s.search, { backgroundColor: theme.taskSurface, color: theme.text }]} />
              <View style={s.stack}>{visibleLists.map((list, index) => {
                const rows = items.filter(i => i.list_id === list.id);
                return <View key={list.id} style={[s.listCard, { backgroundColor: tones[index % tones.length], marginTop: index ? -24 : 0, paddingBottom: index === visibleLists.length - 1 ? 24 : 48 }]}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Open ${list.name}`} onPress={() => router.push(`/list/${list.id}`)} style={s.listLink}>
                    <View style={s.listTop}><ThemedText style={s.listName} numberOfLines={2}>{list.name}</ThemedText><View style={[s.badge, { backgroundColor: theme.tileBadge }]}><ThemedText style={s.badgeText}>{rows.filter(i => i.is_done).length} done</ThemedText></View></View>
                    <View style={s.listBottom}><ThemedText style={s.notes}>{list.emoji}  {rows.length} {rows.length === 1 ? 'item' : 'items'}</ThemedText><ThemedText style={s.arrow}>↗</ThemedText></View>
                  </Pressable>
                  {list.owner_id === session?.user.id && <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${list.name}`} onPress={() => requestDelete(list)} style={s.delete}><ThemedText type="small" themeColor="textSecondary">Delete list</ThemedText></Pressable>}
                </View>;
              })}</View>
              {!visibleLists.length && <View style={[s.empty, { backgroundColor: theme.taskSurface }]}><ThemedText style={s.sectionTitle}>{search || sharedOnly ? 'No lists here yet.' : 'What’s on your list?'}</ThemedText><ThemedText themeColor="textSecondary">Tap + to create a place for your plans.</ThemedText></View>}
            </View>}
          </View>
        </ScrollView>
        <View pointerEvents="box-none" style={s.fabArea}><Pressable accessibilityRole="button" accessibilityLabel="Create a new list" onPress={() => { setError(''); setComposer(true); }} style={[s.fab, { backgroundColor: theme.accent }]}><ThemedText style={[s.plus, { color: theme.onAccent }]}>+</ThemedText>{wide && <ThemedText type="smallBold" style={{ color: theme.onAccent }}>New list</ThemedText>}</Pressable></View>
        <Modal visible={composer} transparent animationType="fade" onRequestClose={() => setComposer(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.scrim}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.modalScroll}>
              <View accessibilityViewIsModal style={[s.sheet, { backgroundColor: theme.backgroundElement }]}>
                <View style={s.sectionHeader}><ThemedText style={s.sectionTitle}>A new little list</ThemedText><Pressable accessibilityRole="button" accessibilityLabel="Close new list" onPress={() => setComposer(false)} style={s.filterButton}><ThemedText>✕</ThemedText></Pressable></View>
                <ThemedText themeColor="textSecondary">Give your plans a place to start.</ThemedText>
                <View style={s.emojis}>{EMOJIS.map(e => <Pressable key={e} accessibilityRole="button" accessibilityLabel={`Choose ${e}`} accessibilityState={{ selected: emoji === e }} onPress={() => setEmoji(e)} style={[s.emoji, { backgroundColor: emoji === e ? theme.accentSoft : theme.taskSurface, borderColor: emoji === e ? theme.accent : 'transparent' }]}><ThemedText style={{ fontSize: 24 }}>{e}</ThemedText></Pressable>)}</View>
                <TextInput accessibilityLabel="List name" value={name} onChangeText={setName} onSubmitEditing={handleCreate} placeholder="e.g. Weekly groceries" placeholderTextColor={theme.textSecondary} style={[s.search, { backgroundColor: theme.taskSurface, color: theme.text }]} />
                {error ? <ThemedText accessibilityRole="alert" themeColor="accent">{error}</ThemedText> : null}
                <Pressable accessibilityRole="button" disabled={!name.trim() || creating} onPress={handleCreate} style={[s.submit, { backgroundColor: theme.accent, opacity: !name.trim() || creating ? 0.5 : 1 }]}><ThemedText type="smallBold" style={{ color: theme.onAccent }}>{creating ? 'Creating…' : 'Create list'}</ThemedText></Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1 }, page: { maxWidth: 1160, width: '100%', alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 110 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 26 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 }, brandName: { fontSize: 22, fontWeight: '700' }, greeting: { fontSize: 25, lineHeight: 32, fontWeight: '600', letterSpacing: -0.8 }, profileButton: { padding: 4 },
  tabs: { flexDirection: 'row', padding: 5, borderRadius: 24, marginBottom: 22 }, tab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 20 }, columns: { gap: 24 }, column: { minWidth: 0 }, tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, tile: { width: '47%', flexGrow: 1, borderRadius: 20, padding: 16, minHeight: 118, gap: 16 }, tileIcon: { width: 36, height: 36, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, icon: { fontSize: 23, lineHeight: 28 }, tileBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, tileLabel: { fontSize: 16, flexShrink: 1 }, tileCount: { fontSize: 28, lineHeight: 34, fontWeight: '500' }, sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 26, marginBottom: 14 }, sectionTitle: { fontSize: 19, lineHeight: 26, fontWeight: '600', letterSpacing: -0.4 }, tasks: { gap: 10 }, task: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 30, gap: 12, minHeight: 84 }, checkOuter: { width: 48, height: 48, borderRadius: 26, alignItems: 'center', justifyContent: 'center' }, check: { width: 23, height: 23, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' }, taskCopy: { flex: 1, gap: 4, minWidth: 0 }, taskTitle: { fontSize: 16, lineHeight: 23, fontWeight: '500' }, more: { width: 36, height: 36, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, filterButton: { padding: 10 }, search: { minHeight: 52, borderRadius: 20, paddingHorizontal: 18, fontSize: 16, marginBottom: 18 }, stack: { marginTop: 4 }, listCard: { borderRadius: 30, paddingHorizontal: 24, paddingTop: 26 }, listLink: { gap: 20 }, listTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, listName: { fontSize: 24, lineHeight: 31, fontWeight: '500', flex: 1, letterSpacing: -0.7 }, badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }, badgeText: { fontSize: 12, lineHeight: 18 }, listBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, notes: { fontSize: 17 }, arrow: { fontSize: 30, lineHeight: 36 }, delete: { alignSelf: 'flex-start', paddingVertical: 10, marginTop: 2 }, empty: { borderRadius: 28, padding: 28, alignItems: 'center', gap: 10 }, emptyIcon: { fontSize: 32, lineHeight: 40 }, fabArea: { position: 'absolute', bottom: 20, right: 24 }, fab: { minWidth: 62, height: 62, borderRadius: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18, elevation: 5, boxShadow: '0 6px 20px rgba(100, 20, 45, 0.2)' }, plus: { fontSize: 34, lineHeight: 40, fontWeight: '400' }, scrim: { flex: 1, backgroundColor: 'rgba(25, 12, 18, 0.45)' }, modalScroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }, sheet: { width: '100%', maxWidth: 440, padding: 24, borderRadius: 30, gap: 10 }, emojis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 14 }, emoji: { width: 48, height: 48, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, submit: { minHeight: 52, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
