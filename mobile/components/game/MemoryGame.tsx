import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';

import { storeApi } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { MemoryCard } from './MemoryCard';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 64 - 20) / 6; // 6 columns with padding and gaps

interface Card {
  id: string;
  type: string;
  pairId: string;
}

interface GameSession {
  deck: Card[];
  signature: string;
  expires_at: string;
  nonce: string;
}

type GameState = 'idle' | 'playing' | 'won' | 'lost' | 'cooldown';

export function MemoryGame() {
  const { t } = useTranslation();
  const { getToken, isSignedIn } = useAuth();
  const { refreshCustomer } = useAuthStore();

  // Game state
  const [gameState, setGameState] = useState<GameState>('idle');
  const [deck, setDeck] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [moves, setMoves] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<string | null>(null);
  const [totalWins, setTotalWins] = useState(0);
  const [pointsAwarded, setPointsAwarded] = useState(0);

  // Refs
  const gameSessionRef = useRef<GameSession | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check game status on mount
  useEffect(() => {
    if (isSignedIn) {
      checkGameStatus();
    }
  }, [isSignedIn]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const checkGameStatus = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await storeApi.game.getStatus(token);

      if (response.can_play) {
        setGameState('idle');
        setCooldownEndsAt(null);
      } else {
        setGameState('cooldown');
        setCooldownEndsAt(response.cooldown_ends_at);
      }

      setTotalWins(response.total_wins || 0);
    } catch (err) {
      console.error('Failed to check game status:', err);
    }
  };

  const startGame = async () => {
    if (!isSignedIn) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const data = await storeApi.game.start(token);

      if (data.cooldown_ends_at && !data.deck) {
        setGameState('cooldown');
        setCooldownEndsAt(data.cooldown_ends_at);
        return;
      }

      // Store session data
      gameSessionRef.current = {
        deck: data.deck,
        signature: data.signature,
        expires_at: data.expires_at,
        nonce: data.nonce,
      };

      setCooldownEndsAt(data.cooldown_ends_at);
      setDeck(data.deck);
      setFlippedCards([]);
      setMatchedPairs([]);
      setTimeLeft(60);
      setMoves(0);
      setGameState('playing');
      startTimeRef.current = Date.now();

      // Start timer
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setGameState('lost');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = useCallback((cardIndex: number) => {
    if (gameState !== 'playing') return;
    if (flippedCards.length >= 2) return;
    if (flippedCards.includes(cardIndex)) return;
    if (matchedPairs.includes(deck[cardIndex].pairId)) return;

    const newFlipped = [...flippedCards, cardIndex];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);

      const [first, second] = newFlipped;
      const card1 = deck[first];
      const card2 = deck[second];

      if (card1.pairId === card2.pairId) {
        // Match!
        const newMatched = [...matchedPairs, card1.pairId];
        setMatchedPairs(newMatched);
        setFlippedCards([]);

        // Check win (9 pairs)
        if (newMatched.length === 9) {
          if (timerRef.current) clearInterval(timerRef.current);
          completeGame();
        }
      } else {
        // No match
        setTimeout(() => {
          setFlippedCards([]);
        }, 1000);
      }
    }
  }, [gameState, flippedCards, matchedPairs, deck]);

  const completeGame = async () => {
    const timeTaken = Math.ceil((Date.now() - startTimeRef.current) / 1000);

    if (timeTaken > 60 || !gameSessionRef.current) {
      setGameState('lost');
      return;
    }

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const response = await storeApi.game.complete(
        gameSessionRef.current.signature,
        gameSessionRef.current.deck,
        gameSessionRef.current.nonce,
        gameSessionRef.current.expires_at,
        timeTaken,
        token
      );

      if (response.success) {
        setPointsAwarded(response.points_awarded || 10);
        setCooldownEndsAt(response.cooldown_ends_at);
        setTotalWins((prev) => prev + 1);
        setGameState('won');

        // Refresh customer to update points
        if (refreshCustomer) {
          setTimeout(() => refreshCustomer(), 1000);
        }
      } else {
        setError(response.message || 'Failed to verify game');
        setGameState('lost');
      }
    } catch (err: any) {
      setError(err.message);
      setGameState('lost');
    }
  };

  const formatCooldown = () => {
    if (!cooldownEndsAt) return '';

    const end = new Date(cooldownEndsAt);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return t('game.playNow') || 'Play Now';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const resetGame = () => {
    setGameState('idle');
    setDeck([]);
    setFlippedCards([]);
    setMatchedPairs([]);
    setTimeLeft(60);
    setMoves(0);
    setError(null);
    setPointsAwarded(0);
    gameSessionRef.current = null;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (isSignedIn) {
      checkGameStatus();
    }
  };

  // Render game states
  const renderIdleState = () => (
    <View className="items-center py-8">
      <Ionicons name="leaf" size={48} color="#7ca163" />
      <Text className="text-xl font-bold text-gray-900 dark:text-white mt-4 mb-2">
        {t('game.readyToPlay') || 'Ready to Play?'}
      </Text>
      <Text className="text-gray-500 text-center mb-2">
        {t('game.matchPairs') || 'Match 9 pairs'} • {t('game.timeLimit') || '60 seconds'}
      </Text>
      <View className="bg-primary-100 dark:bg-primary-900/30 px-4 py-2 rounded-full mb-6">
        <Text className="text-primary-700 dark:text-primary-300">
          {t('game.winReward') || 'Win to earn +10 Zen Points!'}
        </Text>
      </View>

      <Pressable
        onPress={startGame}
        disabled={isLoading}
        className="bg-primary-500 px-8 py-4 rounded-full"
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-lg">
            {t('game.startGame') || 'Start Game'}
          </Text>
        )}
      </Pressable>

      {error && (
        <Text className="text-red-500 mt-4">{error}</Text>
      )}

      {totalWins > 0 && (
        <Text className="text-gray-500 mt-4">
          {t('game.totalWins') || 'Total Wins'}: {totalWins}
        </Text>
      )}
    </View>
  );

  const renderPlayingState = () => (
    <View>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-gray-500 text-xs">{t('game.moves') || 'Moves'}</Text>
          <Text className="text-gray-900 dark:text-white font-bold text-lg">{moves}</Text>
        </View>

        <View className="items-center">
          <Text className={`text-3xl font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-gray-500 text-xs">{t('game.pairs') || 'Pairs'}</Text>
          <Text className="text-gray-900 dark:text-white font-bold text-lg">{matchedPairs.length}/9</Text>
        </View>
      </View>

      {/* Game Grid - 6x3 */}
      <View className="flex-row flex-wrap justify-center">
        {deck.map((card, index) => (
          <MemoryCard
            key={card.id}
            card={card}
            size={CARD_SIZE}
            isFlipped={flippedCards.includes(index)}
            isMatched={matchedPairs.includes(card.pairId)}
            onPress={() => handleCardClick(index)}
            disabled={flippedCards.length >= 2}
          />
        ))}
      </View>
    </View>
  );

  const renderWonState = () => (
    <View className="items-center py-8">
      <View className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center mb-4">
        <Ionicons name="trophy" size={40} color="#7ca163" />
      </View>
      <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {t('game.youWon') || 'You Won!'}
      </Text>
      <Text className="text-gray-500 mb-4">
        {t('game.completedIn', { time: 60 - timeLeft, moves }) || `Completed in ${60 - timeLeft}s with ${moves} moves`}
      </Text>

      <View className="bg-primary-100 dark:bg-primary-900/30 px-6 py-3 rounded-full mb-6">
        <View className="flex-row items-center">
          <Ionicons name="leaf" size={20} color="#7ca163" />
          <Text className="text-primary-700 dark:text-primary-300 font-bold ml-2">
            +{pointsAwarded} {t('auth.zenPoints') || 'Zen Points'}
          </Text>
        </View>
      </View>

      <Text className="text-gray-500 text-center mb-4">
        {t('game.nextGameIn') || 'Next game in'}: {formatCooldown()}
      </Text>
    </View>
  );

  const renderLostState = () => (
    <View className="items-center py-8">
      <View className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full items-center justify-center mb-4">
        <Ionicons name="time-outline" size={40} color="#9ca3af" />
      </View>
      <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {t('game.timeUp') || "Time's Up!"}
      </Text>

      {error && <Text className="text-red-500 mb-2">{error}</Text>}

      <Text className="text-gray-500 text-center mb-4">
        {t('game.loseMessage') || "Don't worry, you can try again later!"}
      </Text>

      {cooldownEndsAt && (
        <Text className="text-gray-500 mb-4">
          {t('game.nextGameIn') || 'Next game in'}: {formatCooldown()}
        </Text>
      )}
    </View>
  );

  const renderCooldownState = () => (
    <View className="items-center py-8">
      <Ionicons name="hourglass-outline" size={48} color="#7ca163" />
      <Text className="text-xl font-bold text-gray-900 dark:text-white mt-4 mb-2">
        {t('game.comeBackLater') || 'Come Back Later'}
      </Text>
      <Text className="text-gray-500 mb-2">
        {t('game.nextGameIn') || 'Next game in'}:
      </Text>
      <Text className="text-2xl font-bold text-primary-600">
        {formatCooldown()}
      </Text>

      {totalWins > 0 && (
        <Text className="text-gray-500 mt-4">
          {t('game.totalWins') || 'Total Wins'}: {totalWins}
        </Text>
      )}
    </View>
  );

  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
      {gameState === 'idle' && renderIdleState()}
      {gameState === 'playing' && renderPlayingState()}
      {gameState === 'won' && renderWonState()}
      {gameState === 'lost' && renderLostState()}
      {gameState === 'cooldown' && renderCooldownState()}
    </View>
  );
}
