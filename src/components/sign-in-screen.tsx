import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { RubyLogo } from '@/components/ruby-logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

export function SignInScreen() {
  const theme = useTheme();
  const wide = useWindowDimensions().width >= 850;
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) {
      setError('Enter an email and password.');
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const action = mode === 'signIn' ? signIn : signUp;
      const result = await action(email.trim(), password);
      if (result.error) setError(result.error);
      else if (mode === 'signUp') setInfo('Account created. Check your inbox if email confirmation is required.');
    } catch {
      setError('Could not reach the sign-in service. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.center}>
          <ScrollView contentContainerStyle={[styles.layout, wide && styles.wideLayout]} keyboardShouldPersistTaps="handled">
          <View style={[styles.hero, { backgroundColor: theme.tileRose }, wide ? { flex: 1, minHeight: 620 } : { padding: 24, gap: 12 }]}>
            <View style={[styles.brand, !wide && { marginBottom: 0 }]}>
              <RubyLogo size={36} />
              <ThemedText style={[styles.wordmark, { color: theme.text }]}>ruby</ThemedText>
            </View>
            {wide && <ThemedText style={[styles.heroLabel, { color: theme.accent }]}>LESS TO REMEMBER. MORE TO ENJOY.</ThemedText>}
            <ThemedText style={[styles.heroTitle, { color: theme.text, fontSize: wide ? 52 : 36, lineHeight: wide ? 58 : 42 }]}>Good things{'\n'}come together.</ThemedText>
            <ThemedText style={[styles.tagline, { color: theme.textSecondary }]}>Your plans, your people, your everyday lists. A thoughtful little home for it all.</ThemedText>
            {wide && <View style={styles.preview}>
              <View style={styles.previewTop}><ThemedText style={styles.previewTitle}>🍋  The weekend list</ThemedText><ThemedText style={styles.previewLabel}>A LITTLE INSPIRATION</ThemedText></View>
              {['Pick up something fresh', 'Plan dinner with friends', 'Make time for a slow morning'].map((text, i) => <View key={text} style={styles.previewRow}><View style={[styles.previewCheck, i === 0 && { backgroundColor: '#A52D47', borderColor: '#A52D47' }]}><ThemedText style={{ color: '#fff', fontSize: 12 }}>{i === 0 ? '✓' : ''}</ThemedText></View><ThemedText style={{ fontSize: 14, color: i === 0 ? '#8A7B80' : '#30282B', textDecorationLine: i === 0 ? 'line-through' : 'none' }}>{text}</ThemedText></View>)}
              <ThemedText style={styles.previewBottom}>A little less scattered. A little more together.</ThemedText>
            </View>}
            {wide && <ThemedText style={[styles.heroFoot, { color: theme.accent }]}>SHARE A LIST. LIGHTEN THE LOAD.</ThemedText>}
          </View>

          <View style={[styles.form, wide && { flex: 1 }, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText style={styles.formLabel} themeColor="accent">YOUR EVERYDAY, ORGANIZED</ThemedText>
            <ThemedText style={styles.formTitle}>{mode === 'signIn' ? 'Welcome back.' : 'Make yourself at home.'}</ThemedText>
            <ThemedText themeColor="textSecondary" style={{ marginBottom: 14 }}>{mode === 'signIn' ? 'Your lists are right where you left them.' : 'A little more room for the things that matter.'}</ThemedText>
            <ThemedText type="smallBold">Email address</ThemedText>            <TextInput
              value={email}
              onChangeText={setEmail}
              accessibilityLabel="Email address"
              autoComplete="email"
              placeholder="you@example.com"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              inputMode="email"
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
            />
            <ThemedText type="smallBold">Password</ThemedText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              accessibilityLabel="Password" placeholder="Your password"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={submit}
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
            />

            {error ? (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}
            {info ? (
              <ThemedText type="small" themeColor="textSecondary">
                {info}
              </ThemedText>
            ) : null}

            <PressableScale
              onPress={submit}
              disabled={busy}
              style={[styles.button, { backgroundColor: theme.accent, opacity: busy ? 0.7 : 1 }]}>
              {busy ? (
                <ActivityIndicator color={theme.onAccent} />
              ) : (
                <ThemedText type="smallBold" style={[styles.buttonText, { color: theme.onAccent }]}>
                  {mode === 'signIn' ? 'Sign in to your space  →' : 'Create your account  →'}
                </ThemedText>
              )}
            </PressableScale>

            <Pressable accessibilityRole="button"
              onPress={() => {
                setMode(mode === 'signIn' ? 'signUp' : 'signIn');
                setError(null);
                setInfo(null);
              }}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.switch}>
                {mode === 'signIn'
                  ? "No account? Create one"
                  : 'Already have an account? Sign in'}
              </ThemedText>
            </Pressable>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, safe: { flex: 1 }, center: { flex: 1 },
  layout: { flexGrow: 1, padding: 20, gap: 20, maxWidth: 1200, width: '100%', alignSelf: 'center', justifyContent: 'center' }, wideLayout: { flexDirection: 'row', alignItems: 'center', padding: 40, gap: 0 },
  hero: { padding: 30, borderRadius: 28, gap: 20, justifyContent: 'center' }, brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }, wordmark: { color: '#FFF5EF', fontSize: 32, lineHeight: 40, fontWeight: '800', letterSpacing: -1.5 }, heroLabel: { color: '#E7B2C1', fontSize: 10, lineHeight: 16, fontWeight: '700', letterSpacing: 1.6 }, heroTitle: { color: '#FFF5EF', fontWeight: '700', letterSpacing: -2 }, tagline: { color: '#EBCDD6', lineHeight: 25, fontSize: 16, maxWidth: 350 }, heroFoot: { color: '#E7B2C1', fontSize: 10, lineHeight: 16, letterSpacing: 1.8, marginTop: 12 },
  preview: { backgroundColor: '#FFFBF6', padding: 22, borderRadius: 18, marginVertical: 10, transform: [{ rotate: '0deg' }] }, previewTop: { gap: 8, marginBottom: 16 }, previewTitle: { color: '#30282B', fontWeight: '700', fontSize: 18 }, previewLabel: { fontSize: 8, lineHeight: 12, color: '#8A7B80', letterSpacing: 1.2 }, previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }, previewCheck: { width: 20, height: 20, borderRadius: 6, borderColor: '#D9CBD0', borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, previewBottom: { color: '#8A7B80', fontSize: 10, lineHeight: 16, marginTop: 18 },
  form: { gap: 12, padding: 28, borderRadius: 24, borderWidth: 1, width: '100%' }, formLabel: { fontSize: 10, lineHeight: 16, letterSpacing: 1.5, fontWeight: '700' }, formTitle: { fontSize: 30, lineHeight: 38, letterSpacing: -1, fontWeight: '700' }, input: { borderRadius: 26, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, minHeight: 54, marginBottom: 6 }, button: { borderRadius: 26, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 54, marginTop: 8 }, buttonText: { color: '#ffffff' }, switch: { textAlign: 'center', paddingVertical: 12 }, error: { color: '#C53350' },
});
