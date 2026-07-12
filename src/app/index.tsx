import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { PressableScale } from '@/components/pressable-scale';
import { RubyLogo } from '@/components/ruby-logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLists } from '@/hooks/use-lists';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/profile';
import { createList, deleteList } from '@/lib/queries';
import type { List } from '@/lib/types';

const EMOJIS = ['🛒', '📝', '✅', '🧳', '🎁', '🍳', '🏠', '💪'];

export default function ListsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const { profile } = useProfile();
  const { lists, loading, refresh } = useLists();
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

  function requestDelete(list: List) {
    const doDelete = async () => {
      try {
        await deleteList(list.id);
        refresh();
      } catch (err) {
        console.warn('Could not delete list', err);
      }
    };
    const message = `Delete "${list.name}"? This permanently removes the list and all its items for everyone it's shared with.`;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) doDelete();
    } else {
      Alert.alert('Delete list', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  }

  function renderDeleteAction() {
    return (
      <View style={[styles.deleteAction, { backgroundColor: theme.accent }]}>
        <ThemedText type="smallBold" style={styles.deleteActionText}>
          Delete
        </ThemedText>
      </View>
    );
  }

  function renderRow(item: List) {
    const owner = item.owner_id === session?.user.id;
    return (
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
        {Platform.OS === 'web' && owner ? (
          <Pressable
            onPress={(e) => {
              (e as unknown as { stopPropagation?: () => void }).stopPropagation?.();
              requestDelete(item);
            }}
            hitSlop={10}
            style={styles.webDelete}>
            <ThemedText type="default" themeColor="textSecondary">
              ✕
            </ThemedText>
          </Pressable>
        ) : (
          <ThemedText type="subtitle" themeColor="textSecondary" style={styles.chevron}>
            ›
          </ThemedText>
        )}
      </Pressable>
    );
  }

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <RubyLogo size={30} />
            <ThemedText type="subtitle">Ruby</ThemedText>
          </View>
          <Pressable onPress={() => router.push('/profile')} hitSlop={8}>
            <Avatar name={profile?.display_name ?? session?.user.email} url={profile?.avatar_url} size={36} />
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
            <PressableScale
              onPress={handleCreate}
              disabled={creating || !name.trim()}
              style={[
                styles.addButton,
                { backgroundColor: theme.accent, opacity: creating || !name.trim() ? 0.5 : 1 },
              ]}>
              <ThemedText type="smallBold" style={[styles.addButtonText, { color: theme.onAccent }]}>
                Create
              </ThemedText>
            </PressableScale>
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
            renderItem={({ item, index }) => {
              const owner = item.owner_id === session?.user.id;
              return (
                <Animated.View entering={FadeInDown.duration(280).delay(Math.min(index * 45, 270))}>
                  {Platform.OS !== 'web' && owner ? (
                    <Swipeable
                      renderLeftActions={renderDeleteAction}
                      leftThreshold={70}
                      overshootLeft={false}
                      friction={1.6}
                      onSwipeableOpen={(direction, swipeable) => {
                        if (direction === 'left') {
                          requestDelete(item);
                          swipeable.close();
                        }
                      }}>
                      {renderRow(item)}
                    </Swipeable>
                  ) : (
                    renderRow(item)
                  )}
                </Animated.View>
              );
            }}
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
  webDelete: { padding: Spacing.one },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    marginRight: Spacing.two,
    borderRadius: Spacing.four,
  },
  deleteActionText: { color: '#ffffff' },
});
