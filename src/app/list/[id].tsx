import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  useEffect(() => {
    fetchList(id).then(setList).catch((err) => console.warn('Failed to load list', err));
  }, [id]);

  const remaining = items.filter((i) => !i.is_done).length;

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
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back}>
            <ThemedText type="default" themeColor="textSecondary">
              ‹ Lists
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.titleRow}>
          <ThemedText style={styles.titleEmoji}>{list?.emoji ?? '📝'}</ThemedText>
          <View style={styles.titleTextWrap}>
            <ThemedText type="subtitle" numberOfLines={1}>
              {list?.name ?? 'List'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {remaining} of {items.length} left
            </ThemedText>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerFill}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                Nothing here yet. Add the first item below.
              </ThemedText>
            }
            renderItem={({ item }) => (
              <View style={[styles.itemRow, { backgroundColor: theme.backgroundElement }]}>
                <Pressable onPress={() => handleToggle(item)} hitSlop={8} style={styles.checkWrap}>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: item.is_done ? '#3c87f7' : theme.textSecondary,
                        backgroundColor: item.is_done ? '#3c87f7' : 'transparent',
                      },
                    ]}>
                    {item.is_done ? <ThemedText style={styles.check}>✓</ThemedText> : null}
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
              </View>
            )}
          />
        )}

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.composer, { borderTopColor: theme.backgroundElement }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Add an item…"
              placeholderTextColor={theme.textSecondary}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <Pressable
              onPress={handleAdd}
              disabled={!text.trim()}
              style={[styles.addButton, { backgroundColor: '#3c87f7', opacity: text.trim() ? 1 : 0.5 }]}>
              <ThemedText type="smallBold" style={styles.addButtonText}>
                Add
              </ThemedText>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  back: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  titleEmoji: { fontSize: 40 },
  titleTextWrap: { flex: 1, gap: 2 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: Spacing.three, gap: Spacing.two },
  empty: { textAlign: 'center', marginTop: Spacing.five },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
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
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 44,
  },
  addButton: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { color: '#ffffff' },
});
