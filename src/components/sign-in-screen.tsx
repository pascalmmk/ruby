import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RubyLogo } from '@/components/ruby-logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

export function SignInScreen() {
  const theme = useTheme();
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
    setBusy(true);
    const action = mode === 'signIn' ? signIn : signUp;
    const { error } = await action(email.trim(), password);
    setBusy(false);
    if (error) {
      setError(error);
    } else if (mode === 'signUp') {
      setInfo('Account created. If email confirmation is on, check your inbox — otherwise you are in.');
    }
  }

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.center}>
          <View style={styles.hero}>
            <View style={styles.brand}>
              <RubyLogo size={44} />
              <ThemedText type="title">Ruby</ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.tagline}>
              Shared lists that sync everywhere, live.
            </ThemedText>
          </View>

          <View style={styles.form}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              inputMode="email"
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={submit}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
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

            <Pressable
              onPress={submit}
              disabled={busy}
              style={[styles.button, { backgroundColor: '#3c87f7', opacity: busy ? 0.6 : 1 }]}>
              {busy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText type="smallBold" style={styles.buttonText}>
                  {mode === 'signIn' ? 'Sign in' : 'Create account'}
                </ThemedText>
              )}
            </Pressable>

            <Pressable
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
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.five,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  hero: { alignItems: 'center', gap: Spacing.two },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  tagline: { textAlign: 'center' },
  form: { gap: Spacing.three },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonText: { color: '#ffffff' },
  switch: { textAlign: 'center' },
  error: { color: '#e5484d' },
});
