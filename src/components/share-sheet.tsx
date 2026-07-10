import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchMembers, shareList, type Member } from '@/lib/queries';

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || '?';
}

export function ShareSheet({ listId, isOwner }: { listId: string; isOwner: boolean }) {
  const theme = useTheme();
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadMembers = useCallback(async () => {
    try {
      setMembers(await fetchMembers(listId));
    } catch (err) {
      console.warn('Failed to load members', err);
    }
  }, [listId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function invite() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await shareList(listId, trimmed);
      if (result === 'added') {
        setStatus(`Invited ${trimmed}`);
        setEmail('');
        loadMembers();
      } else if (result === 'not_found') {
        setStatus(`No Ruby account found for ${trimmed}`);
      } else if (result === 'self') {
        setStatus(`That's you — you already own this list`);
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not invite');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      exiting={FadeOutUp.duration(150)}
      style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText type="smallBold">Shared with</ThemedText>

      <View style={styles.members}>
        {members.map((m) => (
          <View key={m.user_id} style={styles.member}>
            <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
              <ThemedText type="small" style={styles.avatarText}>
                {initials(m.display_name)}
              </ThemedText>
            </View>
            <ThemedText type="small">{m.display_name}</ThemedText>
            {m.role === 'owner' ? (
              <ThemedText type="small" themeColor="textSecondary">
                owner
              </ThemedText>
            ) : null}
          </View>
        ))}
      </View>

      {isOwner ? (
        <>
          <View style={styles.row}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Invite by email…"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              inputMode="email"
              onSubmitEditing={invite}
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
              ]}
            />
            <PressableScale
              onPress={invite}
              disabled={busy || !email.trim()}
              style={[
                styles.button,
                { backgroundColor: theme.accent, opacity: busy || !email.trim() ? 0.5 : 1 },
              ]}>
              {busy ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <ThemedText type="smallBold" style={styles.buttonText}>
                  Invite
                </ThemedText>
              )}
            </PressableScale>
          </View>
          {status ? (
            <ThemedText type="small" themeColor="textSecondary">
              {status}
            </ThemedText>
          ) : null}
        </>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Shared with you by the owner.
        </ThemedText>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  members: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  member: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#ffffff', fontSize: 11 },
  row: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  input: {
    flex: 1,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 44,
  },
  button: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#ffffff' },
});
