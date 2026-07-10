import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { useLists } from '@/hooks/use-lists';
import { useAuth } from '@/lib/auth';
import { createList } from '@/lib/queries';

const EMOJIS = ['🛒', '📝', '✅', '🧳', '🎁', '🍳', '🏠', '💪'];

export default function ListsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { lists, loading } = useLists();

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed || !session) return;
    setCreating(true);
    try {
      const list = await createList(trimmed, emoji, session.user.id);
      setName('');
      setEmoji(EMOJIS[0]);
      router.push(`/list/${list.id}`);
    } catch (err) {
      console.warn('Could not create list', err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">💎 Ruby</ThemedText>
          <Pressable onPress={signOut} hitSlop={8}>
            <ThemedText type="small" themeColor="textSecondary">
              Sign out
            </ThemedText>
          </Pressable>
        </View>

        <View style={[styles.composer, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.emojiRow}>
            {EMOJIS.map((e) => (
              <Pressable
                key={e}
                onPress={() => setEmoji(e)}
                style={[
                  styles.emojiChip,
                  { backgroundColor: emoji === e ? theme.backgroundSelected : 'transparent' },
                ]}>
                <ThemedText type="default">{e}</ThemedText>
              </Pressable>
            ))}
          </View>
          <View style={styles.composerRow}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="New list name…"
              placeholderTextColor={theme.textSecondary}
              onSubmitEditing={handleCreate}
              style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
            />
            <Pressable
              onPress={handleCreate}
              disabled={creating || !name.trim()}
              style={[
                styles.addButton,
                { backgroundColor: '#3c87f7', opacity: creating || !name.trim() ? 0.5 : 1 },
              ]}>
              <ThemedText type="smallBold" style={styles.addButtonText}>
                Create
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerFill}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={lists}
            keyExtractor={(l) => l.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                No lists yet. Create one above to get started.
              </ThemedText>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(`/list/${item.id}`)}
                style={({ pressed }) => [
                  styles.listRow,
                  {
                    backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                  },
                ]}>
                <ThemedText style={styles.listEmoji}>{item.emoji}</ThemedText>
                <ThemedText type="default" style={styles.listName}>
                  {item.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  ›
                </ThemedText>
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  composer: {
    marginHorizontal: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  emojiChip: {
    width: 36,
    height: 36,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerRow: { flexDirection: 'row', gap: Spacing.two },
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
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { color: '#ffffff' },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: Spacing.three, gap: Spacing.two },
  empty: { textAlign: 'center', marginTop: Spacing.five },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  listEmoji: { fontSize: 24 },
  listName: { flex: 1 },
});
