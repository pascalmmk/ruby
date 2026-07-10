import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';

/**
 * A faceted red ruby gem, drawn as tiling polygons so it stays crisp at any
 * size on web and native. Used as the Ruby brand mark in place of an emoji.
 */
export function RubyLogo({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="rubyTable" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FF6E82" />
          <Stop offset="1" stopColor="#E23A50" />
        </LinearGradient>
      </Defs>

      {/* pavilion (lower facets converging to the point) */}
      <Polygon points="16,45 40,40 50,84" fill="#9E1128" />
      <Polygon points="40,40 60,40 50,84" fill="#E3384E" />
      <Polygon points="60,40 84,45 50,84" fill="#7E0C20" />

      {/* crown (upper side facets) */}
      <Polygon points="32,27 16,45 40,40" fill="#CE1E39" />
      <Polygon points="68,27 84,45 60,40" fill="#B01830" />

      {/* table (flat top facet) */}
      <Polygon points="32,27 68,27 60,40 40,40" fill="url(#rubyTable)" />

      {/* highlight glint on the table */}
      <Polygon points="35,29 47,29 44,33 37,33" fill="#FFFFFF" opacity={0.35} />

      {/* crisp outer edge */}
      <Polygon
        points="32,27 68,27 84,45 50,84 16,45"
        fill="none"
        stroke="#6E0A1C"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
