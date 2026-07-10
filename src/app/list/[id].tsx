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
  const [shareOpen, setShareOpen] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchList(id).then(setList).catch((err) => console.warn('Failed to load list', err));
  }, [id]);

  const remaining = items.filter((i) => !i.is_done).length;
  const allDone = items.length > 0 && remaining === 0;

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
    if (!trimmed || !session) return;
    setText('');
    try {
      await addItem(id, trimmed, session.user.id);
    } catch (err) {
      console.warn('Could not add item', err);
      setText(trimmed);
    }
  }

  async function handleToggle(item: Item) {
    if (!session) return;
    try {
      await toggleItem(item, session.user.id);
    } catch (err) {
      console.warn('Could not toggle item', err);
    }
  }

  return (
    <ThemedView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back}>
            <ThemedText type="default" themeColor="textSecondary">
              ‹ Lists
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => setShareOpen((v) => !v)} hitSlop={8} style={styles.back}>
            <ThemedText type="default" themeColor="textSecondary">
              {shareOpen ? 'Close' : 'Share'}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.titleRow}>
          <View style={[styles.titleEmojiWrap, { backgroundColor: theme.accentSoft }]}>
            <ThemedText style={styles.titleEmoji}>{list?.emoji ?? '📝'}</ThemedText>
          </View>
          <View style={styles.titleTextWrap}>
            <ThemedText type="subtitle" numberOfLines={1}>
              {list?.name ?? 'List'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {allDone ? 'All done 🎉' : `${remaining} of ${items.length} left`}
            </ThemedText>
          </View>
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
            data={items}
            style={styles.flex}
            keyExtractor={(i) => i.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            itemLayoutAnimation={LinearTransition.springify().damping(18)}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                Nothing here yet. Add the first item below.
              </ThemedText>
            }
            renderItem={({ item }) => (
              <Animated.View
                entering={FadeInDown.duration(220)}
                exiting={FadeOutUp.duration(180)}
                style={[styles.itemRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <Pressable onPress={() => handleToggle(item)} hitSlop={8} style={styles.checkWrap}>
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
                        <ThemedText style={styles.check}>✓</ThemedText>
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
                <Pressable onPress={() => deleteItem(item.id)} hitSlop={8}>
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
            value={text}
            onChangeText={setText}
            placeholder="Add an item…"
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
            disabled={!text.trim()}
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
  safe: { flex: 1, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  back: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
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
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
  },
  checkWrap: { padding: 2 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
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
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 46,
  },
  addButton: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { color: '#ffffff' },
});
