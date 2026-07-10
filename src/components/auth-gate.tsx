import { type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { SignInScreen } from '@/components/sign-in-screen';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth';

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!session) {
    return <SignInScreen />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
