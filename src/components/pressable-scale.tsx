import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING = { mass: 0.4, damping: 12, stiffness: 260 };

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

/** A Pressable that springs down slightly while pressed for tactile feedback. */
export function PressableScale({ style, scaleTo = 0.95, onPressIn, onPressOut, ...rest }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, SPRING);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, SPRING);
        onPressOut?.(e);
      }}
      style={[animatedStyle, style]}
      {...rest}
    />
  );
}
