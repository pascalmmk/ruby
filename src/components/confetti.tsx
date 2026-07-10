import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const COLORS = ['#E23A50', '#FF6E82', '#FFC24B', '#4BD46E', '#5B8CFF', '#C77DFF'];
const COUNT = 18;

function Piece({ index, originX, originY }: { index: number; originX: number; originY: number }) {
  const t = useSharedValue(0);

  // Trajectory is randomized once per piece.
  const dx = (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 150);
  const rise = 120 + Math.random() * 170;
  const fall = 320 + Math.random() * 220;
  const rot = (Math.random() - 0.5) * 900;
  const size = 7 + Math.random() * 9;
  const round = Math.random() < 0.5;
  const color = COLORS[index % COLORS.length];

  useEffect(() => {
    t.value = withDelay(
      index * 12,
      withTiming(1, { duration: 1200 + Math.random() * 500, easing: Easing.out(Easing.quad) }),
    );
  }, [t, index]);

  const style = useAnimatedStyle(() => {
    const p = t.value;
    const y = -rise * p + fall * p * p; // launch up, then gravity pulls down
    return {
      transform: [{ translateX: dx * p }, { translateY: y }, { rotate: `${rot * p}deg` }],
      opacity: p < 0.85 ? 1 : Math.max(0, 1 - (p - 0.85) / 0.15),
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: originX,
          top: originY,
          width: size,
          height: round ? size : size * 0.5,
          borderRadius: round ? size / 2 : 1,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/** A one-shot confetti burst. Mount it (with a changing key) to replay. */
export function Confetti({ originX, originY }: { originX?: number; originY?: number }) {
  const { width } = useWindowDimensions();
  const ox = originX ?? width / 2;
  const oy = originY ?? 130;

  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: COUNT }).map((_, i) => (
        <Piece key={i} index={i} originX={ox} originY={oy} />
      ))}
    </Animated.View>
  );
}
