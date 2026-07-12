import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

function initials(name?: string | null) {
  return (name ?? '?').trim().slice(0, 2).toUpperCase() || '?';
}

export function Avatar({
  name,
  url,
  size = 36,
}: {
  name?: string | null;
  url?: string | null;
  size?: number;
}) {
  const theme = useTheme();
  const radius = size / 2;

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: theme.backgroundElement }}
        contentFit="cover"
        transition={150}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: radius, backgroundColor: theme.accent },
      ]}>
      <ThemedText type="smallBold" style={[styles.text, { fontSize: size * 0.4 }]}>
        {initials(name)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#ffffff' },
});
