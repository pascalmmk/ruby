import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/profile';
import { updateProfile, uploadAvatar } from '@/lib/queries';

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { profile, refresh } = useProfile();

  const [name, setName] = useState(profile?.display_name ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function pickAvatar() {
    if (!session || uploading) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setStatus('Photo library permission is needed to set a picture.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    const asset = res.assets?.[0];
    if (res.canceled || !asset?.base64) return;

    setUploading(true);
    setStatus(null);
    try {
      const url = await uploadAvatar(session.user.id, asset.base64, asset.mimeType ?? 'image/jpeg');
      await updateProfile(session.user.id, { avatar_url: url });
      setAvatarUrl(url);
      refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not upload photo.');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!session) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setStatus('Username cannot be empty.');
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await updateProfile(session.user.id, { display_name: trimmed });
      refresh();
      setStatus('Saved ✓');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ThemedText type="default" themeColor="textSecondary">
              ‹ Back
            </ThemedText>
          </Pressable>
          <ThemedText type="smallBold">Profile</ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.avatarWrap}>
          <Pressable onPress={pickAvatar} disabled={uploading}>
            <Avatar name={name || profile?.display_name} url={avatarUrl} size={108} />
            <View style={[styles.editBadge, { backgroundColor: theme.accent, borderColor: theme.background }]}>
              {uploading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <ThemedText style={styles.editBadgeText}>✎</ThemedText>
              )}
            </View>
          </Pressable>
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            Tap to change photo
          </ThemedText>
        </View>

        <View style={styles.form}>
          <ThemedText type="smallBold">Username</ThemedText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="words"
            style={[
              styles.input,
              { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}
          />
          <ThemedText type="small" themeColor="textSecondary">{session?.user.email}</ThemedText>

          {status ? (
            <ThemedText type="small" themeColor="textSecondary">
              {status}
            </ThemedText>
          ) : null}

          <PressableScale
            onPress={save}
            disabled={saving}
            style={[styles.button, { backgroundColor: theme.accent, opacity: saving ? 0.6 : 1 }]}>
            <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
              {saving ? 'Saving…' : 'Save'}
            </ThemedText>
          </PressableScale>
        </View>

        <View style={styles.spacer} />

        <Pressable onPress={signOut} style={styles.signOut} hitSlop={8}>
          <ThemedText type="small" style={styles.signOutText}>
            Sign out
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, maxWidth: 480, width: '100%', alignSelf: 'center', paddingHorizontal: Spacing.three },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerSpacer: { width: 48 },
  avatarWrap: { alignItems: 'center', marginTop: Spacing.three, marginBottom: Spacing.four },
  editBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadgeText: { color: '#ffffff', fontSize: 15 },
  hint: { marginTop: Spacing.two },
  form: { gap: Spacing.two },
  input: {
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    minHeight: 48,
  },
  button: {
    marginTop: Spacing.two,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  spacer: { flex: 1 },
  signOut: { alignItems: 'center', paddingVertical: Spacing.three },
  signOutText: { color: '#e5484d' },
});
