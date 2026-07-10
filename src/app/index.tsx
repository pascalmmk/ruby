import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { RubyLogo } from '@/components/ruby-logo';
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
  const insets = useSafeAreaInsets();

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
          <View style={styles.brand}>
            <RubyLogo size={30} />
            <ThemedText type="subtitle">Ruby</ThemedText>
          </View>
          <Pressable onPress={signOut} hitSlop={8}>
            <ThemedText type="small" themeColor="textSecondary">
              Sign out
            </ThemedText>
          </Pressable>
        </View>

        <View style={[styles.composer, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.emojiRow}>
            {EMOJIS.map((e) => (
              <Pressable
                key={e}
                onPress={() => setEmoji(e)}
                style={[
                  styles.emojiChip,
                  {
                    backgroundColor: emoji === e ? theme.accentSoft : 'transparent',
                    borderColor: emoji === e ? theme.accent : 'transparent',
                  },
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
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
              ]}
            />
            <Pressable
              onPress={handleCreate}
              disabled={creating || !name.trim()}
              style={({ pressed }) => [
                styles.addButton,
                {
                  backgroundColor: pressed ? theme.accentPressed : theme.accent,
                  opacity: creating || !name.trim() ? 0.5 : 1,
                },
              ]}>
              <ThemedText type="smallBold" style={[styles.addButtonText, { color: theme.onAccent }]}>
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
          <Animated.FlatList
            data={lists}
            keyExtractor={(l) => l.id}
            itemLayoutAnimation={LinearTransition.springify().damping(18)}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + Spacing.four }]}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                No lists yet. Create one above to get started.
              </ThemedText>
            }
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.duration(280).delay(Math.min(index * 45, 270))}>
                <Pressable
                  onPress={() => router.push(`/list/${item.id}`)}
                  style={({ pressed }) => [
                    styles.listRow,
                    {
                      backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                      borderColor: theme.border,
                    },
                  ]}>
                  <View style={[styles.listEmojiWrap, { backgroundColor: theme.accentSoft }]}>
                    <ThemedText style={styles.listEmoji}>{item.emoji}</ThemedText>
                  </View>
                  <ThemedText type="default" style={styles.listName}>
                    {item.name}
                  </ThemedText>
                  <ThemedText type="subtitle" themeColor="textSecondary" style={styles.chevron}>
                    ›
                  </ThemedText>
                </Pressable>
              </Animated.View>
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
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  composer: {
    marginHorizontal: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.three,
  },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  emojiChip: {
    width: 38,
    height: 38,
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerRow: { flexDirection: 'row', gap: Spacing.two },
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
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
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
    padding: Spacing.two,
    paddingRight: Spacing.three,
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listEmojiWrap: {
    width: 44,
    height: 44,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listEmoji: { fontSize: 24 },
  listName: { flex: 1 },
  chevron: { fontSize: 28, lineHeight: 30, marginTop: -4 },
});
