import { StyleSheet } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/** How far you must drag before the delete fires. */
const TRIGGER = 140;

/**
 * The red panel revealed while swiping a row. It watches the drag distance
 * directly (rather than relying on Swipeable's open callback, which proved
 * unreliable) and fires once the swipe passes TRIGGER.
 */
export function SwipeDeleteAction({
  translation,
  color,
  onTrigger,
}: {
  translation: SharedValue<number>;
  color: string;
  onTrigger: () => void;
}) {
  const fired = useSharedValue(false);

  useAnimatedReaction(
    () => translation.value,
    (v) => {
      if (v > TRIGGER && !fired.value) {
        fired.value = true;
        runOnJS(onTrigger)();
      } else if (v < 10 && fired.value) {
        fired.value = false; // re-arm once the row snaps back
      }
    },
  );

  // Fade/scale in as you drag, and go solid once you're past the trigger point.
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, translation.value / 60)),
    transform: [{ scale: translation.value > TRIGGER ? 1.05 : 1 }],
  }));

  return (
    <Animated.View style={[styles.action, { backgroundColor: color }, animatedStyle]}>
      <ThemedText type="smallBold" style={styles.text}>
        Delete
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  action: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    marginRight: Spacing.two,
    borderRadius: Spacing.four,
  },
  text: { color: '#ffffff' },
});
