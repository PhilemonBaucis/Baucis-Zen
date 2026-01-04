import { useRef, useEffect } from 'react';
import { View, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Zen icon mappings using Ionicons
const ZEN_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  lotus: 'flower-outline',
  bamboo: 'leaf-outline',
  tea: 'cafe-outline',
  yinyang: 'sync-outline',
  wave: 'water-outline',
  mountain: 'triangle-outline',
  moon: 'moon-outline',
  leaf: 'leaf',
  bell: 'notifications-outline',
  stone: 'ellipse-outline',
  incense: 'flame-outline',
  bonsai: 'flower',
};

interface Card {
  id: string;
  type: string;
  pairId: string;
}

interface MemoryCardProps {
  card: Card;
  size: number;
  isFlipped: boolean;
  isMatched: boolean;
  onPress: () => void;
  disabled: boolean;
}

export function MemoryCard({
  card,
  size,
  isFlipped,
  isMatched,
  onPress,
  disabled,
}: MemoryCardProps) {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Flip animation
  useEffect(() => {
    Animated.spring(flipAnim, {
      toValue: isFlipped || isMatched ? 1 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  }, [isFlipped, isMatched]);

  // Match animation
  useEffect(() => {
    if (isMatched) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [isMatched]);

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const frontAnimatedStyle = {
    transform: [
      { rotateY: frontInterpolate },
      { scale: scaleAnim },
    ],
  };

  const backAnimatedStyle = {
    transform: [
      { rotateY: backInterpolate },
      { scale: scaleAnim },
    ],
  };

  const iconName = ZEN_ICONS[card.type] || 'leaf-outline';

  return (
    <Pressable
      onPress={() => !disabled && !isFlipped && !isMatched && onPress()}
      style={{ width: size, height: size, margin: 2 }}
    >
      <View style={{ flex: 1 }}>
        {/* Card Back */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
            },
            backAnimatedStyle,
          ]}
        >
          <View className="flex-1 bg-primary-500 rounded-lg items-center justify-center border-2 border-primary-400">
            <Ionicons name="flower-outline" size={size * 0.4} color="rgba(255,255,255,0.3)" />
          </View>
        </Animated.View>

        {/* Card Front */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
            },
            frontAnimatedStyle,
          ]}
        >
          <View className="flex-1 bg-pink-50 dark:bg-pink-900/20 rounded-lg items-center justify-center border-2 border-pink-300 dark:border-pink-800">
            <Ionicons name={iconName} size={size * 0.5} color="#7ca163" />
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}
