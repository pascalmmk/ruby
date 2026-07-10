import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { initNotifications, notifyLocal } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

type Toast = { id: number; title: string; body: string };

/**
 * App-wide listener: whenever another member adds an item to any list the
 * current user can see, show an in-app toast and fire a local notification.
 * Renders only the floating toast (or nothing).
 */
export function NotificationCenter() {
  const { session } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    initNotifications();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('global-item-inserts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'items' },
        async (payload) => {
          const item = payload.new as { list_id: string; text: string; created_by: string | null };
          // Ignore your own additions.
          if (!item.created_by || item.created_by === session.user.id) return;

          const [{ data: list }, { data: profile }] = await Promise.all([
            supabase.from('lists').select('name, emoji').eq('id', item.list_id).maybeSingle(),
            supabase.from('profiles').select('display_name').eq('id', item.created_by).maybeSingle(),
          ]);

          const who = profile?.display_name ?? 'Someone';
          const title = `${list?.emoji ?? '💎'} ${list?.name ?? 'Shared list'}`;
          const body = `${who} added “${item.text}”`;

          notifyLocal(title, body);

          setToast({ id: Date.now(), title, body });
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setToast(null), 3800);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  if (!toast) return null;

  return (
    <Animated.View
      key={toast.id}
      entering={FadeInUp.springify().damping(16)}
      exiting={FadeOutUp.duration(200)}
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + Spacing.two }]}>
      <Pressable
        onPress={() => setToast(null)}
        style={[styles.toast, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <View style={[styles.dot, { backgroundColor: theme.accent }]} />
        <View style={styles.textWrap}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {toast.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {toast.body}
          </ThemedText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    width: '100%',
    maxWidth: 520,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  textWrap: { flex: 1 },
});
