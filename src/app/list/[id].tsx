import { subscribeOffline } from '@/lib/offline';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  ZoomIn,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Confetti } from '@/components/confetti';
import { PressableScale } from '@/components/pressable-scale';
import { ShareSheet } from '@/components/share-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useItems } from '@/hooks/use-items';
import { useAuth } from '@/lib/auth';
import { addItem, deleteItem, fetchList, toggleItem } from '@/lib/queries';
import type { Item, List } from '@/lib/types';

export default function ListDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { items, loading } = useItems(id);
  const [list, setList] = useState<List | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const refresh = () => { void fetchList(id).then(setList).catch(console.warn); };
    refresh();
    return subscribeOffline(refresh);
  }, [id]);

  const remaining = items.filter((i) => !i.is_done).length;
  const allDone = items.length > 0 && remaining === 0;
  const [view, setView] = useState<'All' | 'To do' | 'Done'>('All');
  const shownItems = items.filter(item => view === 'All' || (view === 'Done' ? item.is_done : !item.is_done));

  // Fire a one-shot celebration the moment a list flips to fully complete.
  const [burstKey, setBurstKey] = useState(0);
  const celebratedRef = useRef(false);
  useEffect(() => {
    if (allDone && !celebratedRef.current) {
      celebratedRef.current = true;
      setBurstKey((k) => k + 1);
    } else if (!allDone) {
      celebratedRef.current = false;
    }
  }, [allDone]);

  async function handleAdd() {
    const trimmed = text.trim();
    if (!trimmed || !session || !list || adding) return;
    setText('');
    setAdding(true);
    setError('');
    try {
      await addItem(id, trimmed, session.user.id);
      setView('To do');
    } catch (err) {
      setError('Could not save this item. Please try again.');
      setText(trimmed);
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(item: Item) {
    if (!session) return;
    try {
      await toggleItem(item, session.user.id);
    } catch (err) {
      setError('Could not save the completion change. Please try again.');
    }
  }

  return (
    <ThemedView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} hitSlop={8} style={styles.back}>
            <ThemedText type="default" themeColor="textSecondary">
              ‹ Lists
            </ThemedText>
          </Pressable>
          <Pressable disabled={!list} onPress={() => setShareOpen((v) => !v)} hitSlop={8} style={styles.back}>
            <ThemedText type="default" themeColor="textSecondary">
              {shareOpen ? 'Close' : 'Share'}
            </ThemedText>
          </Pressable>
        </View>

        <View style={[styles.titleRow, { backgroundColor: theme.tileRose }]}>
          <View style={[styles.titleEmojiWrap, { backgroundColor: theme.accentSoft }]}>
            <ThemedText style={styles.titleEmoji}>{list?.emoji ?? '📝'}</ThemedText>
          </View>
          <View style={styles.titleTextWrap}>
            <ThemedText type="subtitle" numberOfLines={1}>
              {list?.name ?? 'List unavailable'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {allDone ? 'All done 🎉' : `${remaining} of ${items.length} left`}
            </ThemedText>
          </View>
        </View>

        {!list && <ThemedText style={{ paddingHorizontal: 24 }} themeColor="textSecondary">This list has not loaded or is no longer available. Connect to sync, or return to your lists.</ThemedText>}
        {error ? <ThemedText accessibilityRole="alert" style={{ paddingHorizontal: 24 }} themeColor="accent">{error}</ThemedText> : null}
        <View style={styles.progressSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><ThemedText type="small" themeColor="textSecondary">A little progress, every day</ThemedText><ThemedText type="smallBold" themeColor="accent">{items.length ? Math.round((items.length - remaining) / items.length * 100) : 0}%</ThemedText></View>
          <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}><View style={{ height: 6, borderRadius: 6, backgroundColor: theme.accent, width: `${items.length ? (items.length - remaining) / items.length * 100 : 0}%` }} /></View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>{(['All', 'To do', 'Done'] as const).map(label => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: view === label }} onPress={() => setView(label)} style={[styles.tab, { backgroundColor: view === label ? theme.text : theme.backgroundSelected }]}><ThemedText type="small" style={{ color: view === label ? theme.background : theme.textSecondary }}>{label} · {label === 'All' ? items.length : label === 'Done' ? items.length - remaining : remaining}</ThemedText></Pressable>)}</View>
        </View>
        {allDone ? (
          <Animated.View
            entering={FadeInDown.springify().damping(14)}
            exiting={FadeOutUp.duration(160)}
            style={[styles.doneBanner, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              🎉 Every item checked off — nice work!
            </ThemedText>
          </Animated.View>
        ) : null}

        {shareOpen ? (
          <ShareSheet listId={id} isOwner={!!session && list?.owner_id === session.user.id} />
        ) : null}

        {loading ? (
          <View style={styles.centerFill}>
            <ActivityIndicator />
          </View>
        ) : (
          <Animated.FlatList
            data={shownItems}
            style={styles.flex}
            keyExtractor={(i) => i.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            itemLayoutAnimation={LinearTransition.springify().damping(18)}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                {items.length ? 'Nothing in this view. A little breathing room.' : 'A fresh page for your plans. Add your first item below.'}
              </ThemedText>
            }
            renderItem={({ item }) => (
              <Animated.View
                entering={FadeInDown.duration(220)}
                exiting={FadeOutUp.duration(180)}
                style={[styles.itemRow, { backgroundColor: theme.taskSurface, borderColor: theme.taskSurface }]}>
                <Pressable accessibilityRole="checkbox" accessibilityLabel={item.text} accessibilityState={{ checked: item.is_done }} onPress={() => handleToggle(item)} hitSlop={8} style={[styles.checkWrap, { backgroundColor: theme.backgroundElement }]}>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: item.is_done ? theme.accent : theme.textSecondary,
                        backgroundColor: item.is_done ? theme.accent : 'transparent',
                      },
                    ]}>
                    {item.is_done ? (
                      <Animated.View entering={ZoomIn.springify().damping(12)}>
                        <ThemedText style={[styles.check, { color: theme.onAccent }]}>✓</ThemedText>
                      </Animated.View>
                    ) : null}
                  </View>
                </Pressable>
                <ThemedText
                  type="default"
                  style={[
                    styles.itemText,
                    item.is_done && { textDecorationLine: 'line-through', color: theme.textSecondary },
                  ]}>
                  {item.text}
                </ThemedText>
                <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${item.text}`} onPress={() => { void deleteItem(item.id).catch(() => setError('Could not delete this item. Please try again.')); }} hitSlop={8} style={{ padding: 10 }}>
                  <ThemedText type="default" themeColor="textSecondary">
                    ✕
                  </ThemedText>
                </Pressable>
              </Animated.View>
            )}
          />
        )}

        <View
          style={[
            styles.composer,
            {
              borderTopColor: theme.backgroundElement,
              paddingBottom: Math.max(insets.bottom, Spacing.two) + Spacing.two,
            },
          ]}>
          <TextInput
            editable={!adding}
            value={text}
            onChangeText={setText}
            accessibilityLabel="New item" placeholder="What needs doing?"
            placeholderTextColor={theme.textSecondary}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            blurOnSubmit={false}
            style={[
              styles.input,
              { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}
          />
          <PressableScale
            onPress={handleAdd}
            disabled={!text.trim() || !list || adding}
            style={[
              styles.addButton,
              { backgroundColor: theme.accent, opacity: text.trim() ? 1 : 0.5 },
            ]}>
            <ThemedText type="smallBold" style={[styles.addButtonText, { color: theme.onAccent }]}>
              Add
            </ThemedText>
          </PressableScale>
        </View>
      </SafeAreaView>
      </KeyboardAvoidingView>
      {allDone ? <Confetti key={burstKey} /> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  safe: { flex: 1, maxWidth: 820, width: '100%', alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
  },
  back: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 30,
  },
  progressSection: { paddingHorizontal: 24, gap: 10, paddingVertical: 20 },
  progressTrack: { height: 6, borderRadius: 6 },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 },
  titleEmojiWrap: {
    width: 56,
    height: 56,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleEmoji: { fontSize: 32 },
  titleTextWrap: { flex: 1, gap: 2 },
  doneBanner: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: Spacing.three, gap: Spacing.two },
  empty: { textAlign: 'center', marginTop: Spacing.five },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 30,
    borderWidth: 0,
  },
  checkWrap: { padding: 12, borderRadius: 26 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { color: '#ffffff', fontSize: 14, lineHeight: 16, fontWeight: '700' },
  itemText: { flex: 1 },
  composer: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 27,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 54,
  },
  addButton: {
    borderRadius: 26,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { color: '#ffffff' },
});
