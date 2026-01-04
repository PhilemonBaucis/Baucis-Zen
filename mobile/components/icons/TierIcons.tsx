import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface TierIconProps {
  size?: number;
  color?: string;
}

// Seed tier icon - small seed with stem
export function SeedIcon({ size = 24, color = '#a8a29e' }: TierIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18c-4 0-6-3-6-6 0-4 3-8 6-10 3 2 6 6 6 10 0 3-2 6-6 6z"
      />
      <Path strokeLinecap="round" strokeLinejoin="round" d="M12 18v3" />
    </Svg>
  );
}

// Sprout tier icon - growing sprout with leaves
export function SproutIcon({ size = 24, color = '#10b981' }: TierIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <Path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-6" />
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15c-3 0-5-2.5-5-5 0-3.5 2.5-6 5-8 2.5 2 5 4.5 5 8 0 2.5-2 5-5 5z"
      />
      <Path strokeLinecap="round" strokeLinejoin="round" d="M7 18c0-2 2-3 5-3s5 1 5 3" />
    </Svg>
  );
}

// Blossom tier icon - flower with petals
export function BlossomIcon({ size = 24, color = '#ec4899' }: TierIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <Circle cx={12} cy={12} r={3} />
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2c0 3-2 5-2 5s2 2 2 5c0-3 2-5 2-5s-2-2-2-5z"
      />
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M22 12c-3 0-5-2-5-2s-2 2-5 2c3 0 5 2 5 2s2-2 5-2z"
      />
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 22c0-3 2-5 2-5s-2-2-2-5c0 3-2 5-2 5s2 2 2 5z"
      />
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2 12c3 0 5 2 5 2s2-2 5-2c-3 0-5-2-5-2s-2 2-5 2z"
      />
    </Svg>
  );
}

// Lotus tier icon - full lotus flower
export function LotusIcon({ size = 24, color = '#f59e0b' }: TierIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3c-2 3-3 6-3 9s1 6 3 9c2-3 3-6 3-9s-1-6-3-9z"
      />
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12c2-1 4-1 7-1s5 0 7 1c-1 3-3 5-7 7-4-2-6-4-7-7z"
      />
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10c3 0 5 1 6 2-1 2-3 3-6 3 0-2 0-4 0-5z"
      />
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 10c-3 0-5 1-6 2 1 2 3 3 6 3 0-2 0-4 0-5z"
      />
    </Svg>
  );
}

// Map tier names to icon components
export const TierIcons = {
  seed: SeedIcon,
  sprout: SproutIcon,
  blossom: BlossomIcon,
  lotus: LotusIcon,
};

export type TierName = keyof typeof TierIcons;
