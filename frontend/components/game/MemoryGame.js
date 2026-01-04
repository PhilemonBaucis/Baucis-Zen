'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useClerk } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';

// Zen-themed SVG Icons for the memory cards
const ZenIcons = {
  lotus: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M32 56c-8-8-16-20-16-28s8-16 16-16 16 8 16 16-8 20-16 28z" fill="currentColor" opacity="0.3"/>
      <path d="M32 12c-4 8-4 16 0 24 4-8 4-16 0-24z" fill="currentColor"/>
      <path d="M20 24c8 0 12 8 12 16-8-4-16-8-12-16z" fill="currentColor" opacity="0.7"/>
      <path d="M44 24c-8 0-12 8-12 16 8-4 16-8 12-16z" fill="currentColor" opacity="0.7"/>
      <path d="M12 32c8-4 16 0 20 8-8 4-20 0-20-8z" fill="currentColor" opacity="0.5"/>
      <path d="M52 32c-8-4-16 0-20 8 8 4 20 0 20-8z" fill="currentColor" opacity="0.5"/>
    </svg>
  ),
  bamboo: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <rect x="28" y="8" width="8" height="48" rx="2" fill="currentColor" opacity="0.8"/>
      <rect x="28" y="16" width="8" height="2" fill="currentColor"/>
      <rect x="28" y="28" width="8" height="2" fill="currentColor"/>
      <rect x="28" y="40" width="8" height="2" fill="currentColor"/>
      <path d="M36 20c8-4 12 0 12 8-4-2-8-4-12-8z" fill="currentColor" opacity="0.6"/>
      <path d="M28 32c-8-4-12 0-12 8 4-2 8-4 12-8z" fill="currentColor" opacity="0.6"/>
      <path d="M36 44c8-4 12 0 12 8-4-2-8-4-12-8z" fill="currentColor" opacity="0.6"/>
    </svg>
  ),
  tea: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <ellipse cx="28" cy="48" rx="16" ry="4" fill="currentColor" opacity="0.3"/>
      <path d="M12 28c0-4 4-8 8-8h16c4 0 8 4 8 8v12c0 8-6 12-16 12s-16-4-16-12V28z" fill="currentColor" opacity="0.7"/>
      <path d="M44 32c4 0 8 2 8 6s-4 6-8 6" stroke="currentColor" strokeWidth="3" fill="none"/>
      <path d="M20 16c2-4 6-4 8 0" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
      <path d="M28 12c2-4 6-4 8 0" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
    </svg>
  ),
  yinyang: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <circle cx="32" cy="32" r="24" fill="currentColor" opacity="0.2"/>
      <path d="M32 8a24 24 0 0 1 0 48 12 12 0 0 1 0-24 12 12 0 0 0 0-24z" fill="currentColor" opacity="0.8"/>
      <circle cx="32" cy="20" r="4" fill="currentColor" opacity="0.2"/>
      <circle cx="32" cy="44" r="4" fill="currentColor" opacity="0.8"/>
    </svg>
  ),
  wave: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M8 32c4-8 12-8 16 0s12 8 16 0 12-8 16 0" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.8"/>
      <path d="M8 44c4-8 12-8 16 0s12 8 16 0 12-8 16 0" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.5"/>
      <path d="M8 20c4-8 12-8 16 0s12 8 16 0 12-8 16 0" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.5"/>
    </svg>
  ),
  mountain: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M8 52L24 20l8 12 8-12 16 32H8z" fill="currentColor" opacity="0.6"/>
      <path d="M32 20l-6 10 6 4 6-4-6-10z" fill="white" opacity="0.8"/>
      <path d="M20 52l8-16 4 6 4-6 8 16" fill="currentColor" opacity="0.4"/>
      <circle cx="48" cy="16" r="6" fill="currentColor" opacity="0.3"/>
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M36 8a24 24 0 1 0 0 48 20 20 0 1 1 0-48z" fill="currentColor" opacity="0.8"/>
      <circle cx="24" cy="20" r="2" fill="currentColor" opacity="0.4"/>
      <circle cx="16" cy="32" r="1.5" fill="currentColor" opacity="0.4"/>
      <circle cx="28" cy="44" r="2" fill="currentColor" opacity="0.4"/>
    </svg>
  ),
  leaf: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M32 8c16 8 24 24 16 40-8-4-20-4-28-16C12 20 20 12 32 8z" fill="currentColor" opacity="0.7"/>
      <path d="M32 8c0 16-4 28-12 40" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5"/>
      <path d="M28 20c-4 8-8 16-8 24" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <path d="M36 24c0 8-2 16-4 20" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M32 8c-12 0-20 8-20 20v12l-4 8h48l-4-8V28c0-12-8-20-20-20z" fill="currentColor" opacity="0.7"/>
      <ellipse cx="32" cy="52" rx="6" ry="4" fill="currentColor" opacity="0.9"/>
      <circle cx="32" cy="8" r="4" fill="currentColor" opacity="0.5"/>
      <path d="M20 28c0-8 6-12 12-12" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
    </svg>
  ),
  stone: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <ellipse cx="32" cy="48" rx="20" ry="8" fill="currentColor" opacity="0.3"/>
      <ellipse cx="32" cy="44" rx="16" ry="10" fill="currentColor" opacity="0.6"/>
      <ellipse cx="28" cy="32" rx="10" ry="8" fill="currentColor" opacity="0.7"/>
      <ellipse cx="36" cy="24" rx="8" ry="6" fill="currentColor" opacity="0.8"/>
      <ellipse cx="32" cy="16" rx="5" ry="4" fill="currentColor" opacity="0.9"/>
    </svg>
  ),
  incense: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <rect x="30" y="28" width="4" height="28" fill="currentColor" opacity="0.8"/>
      <ellipse cx="32" cy="56" rx="12" ry="4" fill="currentColor" opacity="0.4"/>
      <path d="M32 8c-2 6 2 10 0 16s2 4 0 4" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5"/>
      <path d="M28 12c-2 4 1 8 0 12" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3"/>
    </svg>
  ),
  bonsai: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <rect x="28" y="40" width="8" height="12" fill="currentColor" opacity="0.7"/>
      <ellipse cx="32" cy="52" rx="14" ry="4" fill="currentColor" opacity="0.4"/>
      <ellipse cx="32" cy="28" rx="16" ry="12" fill="currentColor" opacity="0.6"/>
      <ellipse cx="20" cy="24" rx="8" ry="6" fill="currentColor" opacity="0.5"/>
      <ellipse cx="44" cy="24" rx="8" ry="6" fill="currentColor" opacity="0.5"/>
      <ellipse cx="32" cy="16" rx="10" ry="8" fill="currentColor" opacity="0.7"/>
    </svg>
  ),
};

// Card back design
const CardBack = () => (
  <div className="w-full h-full bg-gradient-to-br from-baucis-green-500 to-baucis-green-700 rounded-xl flex items-center justify-center">
    <div className="w-12 h-12 text-white/30">
      {ZenIcons.lotus}
    </div>
  </div>
);

// Single memory card component
function MemoryCard({ card, isFlipped, isMatched, onClick, disabled }) {
  return (
    <div
      onClick={() => !disabled && !isFlipped && !isMatched && onClick()}
      className={`
        relative aspect-square cursor-pointer transition-transform duration-300
        ${!disabled && !isFlipped && !isMatched ? 'hover:scale-105' : ''}
        ${isMatched ? 'opacity-0 pointer-events-none' : ''}
      `}
      style={{ perspective: '1000px' }}
    >
      <div
        className={`
          relative w-full h-full transition-transform duration-500
          ${isFlipped || isMatched ? '[transform:rotateY(180deg)]' : ''}
        `}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Card Back */}
        <div
          className="absolute inset-0 rounded-xl shadow-md border-2 border-baucis-green-200 [backface-visibility:hidden]"
        >
          <CardBack />
        </div>
        
        {/* Card Front */}
        <div
          className="absolute inset-0 rounded-xl shadow-md border-2 border-baucis-pink-300 bg-gradient-to-br from-baucis-pink-50 to-white p-3 [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          <div className="w-full h-full text-baucis-green-600">
            {ZenIcons[card.type]}
          </div>
        </div>
      </div>
    </div>
  );
}

// Timer display component
function Timer({ seconds, isWarning }) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  return (
    <div className={`
      text-2xl font-bold tabular-nums
      ${isWarning ? 'text-red-500 animate-pulse' : 'text-baucis-green-700'}
    `} style={{ fontFamily: 'Libre Baskerville, serif' }}>
      {mins}:{secs.toString().padStart(2, '0')}
    </div>
  );
}

// Main Memory Game component
export default function MemoryGame() {
  const t = useTranslations('game');
  const { isLoggedIn, customer, refreshCustomer, triggerPointsAnimation } = useAuth();
  const { openSignIn } = useClerk();
  
  // Game state
  const [gameState, setGameState] = useState('idle'); // idle, playing, won, lost, cooldown
  const [deck, setDeck] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [moves, setMoves] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cooldownEndsAt, setCooldownEndsAt] = useState(null);
  const [totalWins, setTotalWins] = useState(0);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  
  // Game session data (for verification)
  const gameSessionRef = useRef(null);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  
  // Check game status on mount and when auth changes
  useEffect(() => {
    if (isLoggedIn) {
      checkGameStatus();
    }
  }, [isLoggedIn]);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // Check if user can play
  const checkGameStatus = async () => {
    try {
      const response = await fetch('/api/game/memory/status');
      const data = await response.json();
      
      if (data.can_play) {
        setGameState('idle');
        setCooldownEndsAt(null);
      } else {
        setGameState('cooldown');
        setCooldownEndsAt(data.cooldown_ends_at);
      }
      
      setTotalWins(data.total_wins || 0);
    } catch (err) {
      console.error('Failed to check game status:', err);
    }
  };
  
  // Start a new game
  const startGame = async () => {
    if (!isLoggedIn) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/game/memory/start', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 429) {
          setGameState('cooldown');
          setCooldownEndsAt(data.cooldown_ends_at);
          return;
        }
        throw new Error(data.message || 'Failed to start game');
      }
      
      // Store session data for verification
      gameSessionRef.current = {
        deck: data.deck,
        signature: data.signature,
        expires_at: data.expires_at,
        nonce: data.nonce,
      };
      
      // Store cooldown (game counts as used when started)
      setCooldownEndsAt(data.cooldown_ends_at);
      
      setDeck(data.deck);
      setFlippedCards([]);
      setMatchedPairs([]);
      setTimeLeft(60);
      setMoves(0);
      setGameState('playing');
      startTimeRef.current = Date.now();
      
      // Start the timer
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setGameState('lost');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle card click
  const handleCardClick = useCallback((cardIndex) => {
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
        // Match found!
        const newMatched = [...matchedPairs, card1.pairId];
        setMatchedPairs(newMatched);
        setFlippedCards([]);
        
        // Check for win (9 pairs)
        if (newMatched.length === 9) {
          clearInterval(timerRef.current);
          completeGame();
        }
      } else {
        // No match - flip back after delay
        setTimeout(() => {
          setFlippedCards([]);
        }, 1000);
      }
    }
  }, [gameState, flippedCards, matchedPairs, deck]);
  
  // Complete the game and claim points
  const completeGame = async () => {
    const timeTaken = Math.ceil((Date.now() - startTimeRef.current) / 1000);
    
    if (timeTaken > 60) {
      setGameState('lost');
      return;
    }
    
    try {
      const response = await fetch('/api/game/memory/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: gameSessionRef.current.signature,
          deck: gameSessionRef.current.deck,
          nonce: gameSessionRef.current.nonce,
          expires_at: gameSessionRef.current.expires_at,
          time_taken: timeTaken,
        }),
      });
      
      const data = await response.json();
      
      console.log('[Memory Game] Complete response:', response.status, data);
      
      if (response.ok && data.success) {
        setPointsAwarded(data.points_awarded);
        setCooldownEndsAt(data.cooldown_ends_at);
        setTotalWins((prev) => prev + 1);
        setGameState('won');
        
        // Trigger zen points animation + delayed refresh
        if (data.points_awarded && triggerPointsAnimation) {
          triggerPointsAnimation(data.points_awarded, data.zen_points?.current_balance);
        } else if (refreshCustomer) {
          await refreshCustomer();
        }
      } else {
        console.error('[Memory Game] Complete failed:', data);
        setError(data.message || data.error || 'Failed to verify game');
        setGameState('lost');
      }
    } catch (err) {
      console.error('[Memory Game] Complete error:', err);
      setError(err.message || 'Network error');
      setGameState('lost');
    }
  };
  
  // Format cooldown time remaining
  const formatCooldown = () => {
    if (!cooldownEndsAt) return '';
    
    const end = new Date(cooldownEndsAt);
    const now = new Date();
    const diff = end - now;
    
    if (diff <= 0) return t('playNow');
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  
  // Reset game to try again
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
    
    // Check status again
    if (isLoggedIn) {
      checkGameStatus();
    }
  };

  // Render guest overlay
  const renderGuestOverlay = () => (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10">
      <div className="text-baucis-green-600 w-12 h-12 mb-3">
        {ZenIcons.lotus}
      </div>
      <h3 
        className="text-lg text-baucis-green-800 mb-1"
        style={{ fontFamily: 'Libre Baskerville, serif' }}
      >
        {t('signInToPlay')}
      </h3>
      <p className="text-baucis-green-600 text-xs mb-3 text-center max-w-xs px-4" style={{ fontFamily: 'Crimson Text, serif' }}>
        {t('signInDescription')}
      </p>
      <button
        onClick={() => openSignIn()}
        className="px-5 py-2 bg-gradient-to-r from-baucis-green-500 to-baucis-green-600 text-white rounded-full text-xs hover:from-baucis-green-600 hover:to-baucis-green-700 transition-all duration-300 hover:scale-105"
        style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.1em' }}
      >
        {t('signIn')}
      </button>
    </div>
  );

  // Render cooldown state
  const renderCooldownState = () => (
    <div className="text-center py-4">
      <div className="text-baucis-green-500 w-14 h-14 mx-auto mb-3">
        {ZenIcons.lotus}
      </div>
      <h3 
        className="text-lg text-baucis-green-800 mb-1"
        style={{ fontFamily: 'Libre Baskerville, serif' }}
      >
        {t('comeBackLater')}
      </h3>
      <p className="text-baucis-green-600 text-xs mb-1" style={{ fontFamily: 'Crimson Text, serif' }}>
        {t('nextGameIn')}
      </p>
      <p className="text-xl font-bold text-baucis-green-700" style={{ fontFamily: 'Libre Baskerville, serif' }}>
        {formatCooldown()}
      </p>
      {totalWins > 0 && (
        <p className="text-xs text-baucis-green-500 mt-3" style={{ fontFamily: 'Crimson Text, serif' }}>
          {t('totalWins')}: {totalWins}
        </p>
      )}
    </div>
  );

  // Render won state
  const renderWonState = () => (
    <div className="text-center py-4">
      <div className="text-baucis-green-500 w-16 h-16 mx-auto mb-3 animate-zen-float">
        {ZenIcons.lotus}
      </div>
      <h3 
        className="text-xl text-baucis-green-800 mb-1"
        style={{ fontFamily: 'Libre Baskerville, serif' }}
      >
        {t('youWon')}
      </h3>
      <p className="text-baucis-green-600 text-sm mb-2" style={{ fontFamily: 'Crimson Text, serif' }}>
        {t('completedIn', { time: 60 - timeLeft, moves })}
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-baucis-green-100 to-baucis-pink-100 rounded-full mb-3">
        <div className="w-4 h-4 text-baucis-green-600">{ZenIcons.lotus}</div>
        <span className="text-baucis-green-700 font-semibold text-sm">
          +{pointsAwarded} {t('zenPoints')}
        </span>
      </div>
      <p className="text-baucis-green-600 text-xs mb-3 max-w-xs mx-auto" style={{ fontFamily: 'Crimson Text, serif' }}>
        {t('winMessage')}
      </p>
      <p className="text-xs text-baucis-green-500 mb-4" style={{ fontFamily: 'Crimson Text, serif' }}>
        {t('nextGameIn')}: {formatCooldown()}
      </p>
      <a
        href="/products"
        className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-baucis-green-500 to-baucis-green-600 text-white rounded-full text-xs hover:from-baucis-green-600 hover:to-baucis-green-700 transition-all duration-300 hover:scale-105"
        style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.1em' }}
      >
        {t('shopProducts')}
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </a>
    </div>
  );

  // Render lost state - show cooldown timer
  const renderLostState = () => (
    <div className="text-center py-4">
      <div className="text-baucis-pink-400 w-14 h-14 mx-auto mb-3">
        {ZenIcons.tea}
      </div>
      <h3 
        className="text-xl text-baucis-green-800 mb-2"
        style={{ fontFamily: 'Libre Baskerville, serif' }}
      >
        {t('timeUp')}
      </h3>
      {error && (
        <p className="text-red-500 text-xs mb-2">{error}</p>
      )}
      <p className="text-baucis-green-600 text-sm mb-3 max-w-xs mx-auto" style={{ fontFamily: 'Crimson Text, serif' }}>
        {t('loseMessage')}
      </p>
      {cooldownEndsAt && (
        <>
          <p className="text-baucis-green-500 text-xs mb-1" style={{ fontFamily: 'Crimson Text, serif' }}>{t('nextGameIn')}</p>
          <p className="text-lg font-bold text-baucis-green-700 mb-4" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {formatCooldown()}
          </p>
        </>
      )}
      <a
        href="/products"
        className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-baucis-green-500 to-baucis-green-600 text-white rounded-full text-xs hover:from-baucis-green-600 hover:to-baucis-green-700 transition-all duration-300 hover:scale-105"
        style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.1em' }}
      >
        {t('shopProducts')}
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </a>
    </div>
  );

  // Render idle state (ready to play)
  const renderIdleState = () => (
    <div className="text-center py-4">
      <div className="text-baucis-green-500 w-14 h-14 mx-auto mb-3">
        {ZenIcons.lotus}
      </div>
      <h3 
        className="text-lg text-baucis-green-800 mb-1"
        style={{ fontFamily: 'Libre Baskerville, serif' }}
      >
        {t('readyToPlay')}
      </h3>
      <p className="text-baucis-green-600 text-sm mb-1" style={{ fontFamily: 'Crimson Text, serif' }}>
        {t('matchPairs')} • {t('timeLimit')}
      </p>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-baucis-green-100 to-baucis-pink-100 rounded-full mb-4">
        <div className="w-4 h-4 text-baucis-green-600">{ZenIcons.lotus}</div>
        <span className="text-baucis-green-700 text-xs">
          {t('winReward')}
        </span>
      </div>
      <div>
        <button
          onClick={startGame}
          disabled={isLoading}
          className="px-6 py-2.5 bg-gradient-to-r from-baucis-green-500 to-baucis-green-600 text-white rounded-full hover:from-baucis-green-600 hover:to-baucis-green-700 transition-all duration-300 hover:scale-105 disabled:opacity-50 text-sm"
          style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.1em' }}
        >
          {isLoading ? t('loading') : t('startGame')}
        </button>
      </div>
      {error && (
        <p className="text-red-500 text-xs mt-3">{error}</p>
      )}
      {totalWins > 0 && (
        <p className="text-xs text-baucis-green-500 mt-3" style={{ fontFamily: 'Crimson Text, serif' }}>
          {t('totalWins')}: {totalWins}
        </p>
      )}
    </div>
  );

  // Render playing state (game board)
  const renderPlayingState = () => (
    <div>
      {/* Game Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="text-baucis-green-600 text-xs">
          <span>{t('moves')}:</span>
          <span className="ml-1 font-semibold">{moves}</span>
        </div>
        <Timer seconds={timeLeft} isWarning={timeLeft <= 10} />
        <div className="text-baucis-green-600 text-xs">
          <span>{t('pairs')}:</span>
          <span className="ml-1 font-semibold">{matchedPairs.length}/9</span>
        </div>
      </div>
      
      {/* Game Board - 6x3 grid */}
      <div className="grid grid-cols-6 gap-2">
        {deck.map((card, index) => (
          <MemoryCard
            key={card.id}
            card={card}
            isFlipped={flippedCards.includes(index)}
            isMatched={matchedPairs.includes(card.pairId)}
            onClick={() => handleCardClick(index)}
            disabled={flippedCards.length >= 2}
          />
        ))}
      </div>
    </div>
  );

  return (
    <section className="pt-9 md:pt-12 pb-20 md:pb-24 bg-gradient-to-b from-baucis-pink-50 to-white">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span 
            className="text-baucis-green-500 text-sm tracking-[0.3em] uppercase mb-4 block"
            style={{ fontFamily: 'Libre Baskerville, serif' }}
          >
            {t('dailyChallenge')}
          </span>
          <h2 
            className="text-3xl md:text-4xl lg:text-5xl text-baucis-green-800 mb-4"
            style={{ fontFamily: 'Libre Baskerville, serif' }}
          >
            {t('title')}
          </h2>
          <p 
            className="text-baucis-green-600 max-w-2xl mx-auto text-base md:text-lg"
            style={{ fontFamily: 'Crimson Text, serif' }}
          >
            {t('subtitle')}
          </p>
          <div className="w-16 h-1 bg-gradient-to-r from-baucis-pink-400 to-baucis-green-400 mx-auto mt-4 rounded-full" />
        </div>

        {/* Game Container */}
        <div className="relative bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-baucis-green-100 max-w-4xl mx-auto">
          {/* Guest overlay */}
          {!isLoggedIn && renderGuestOverlay()}
          
          {/* Game content based on state */}
          {isLoggedIn && gameState === 'idle' && renderIdleState()}
          {isLoggedIn && gameState === 'playing' && renderPlayingState()}
          {isLoggedIn && gameState === 'won' && renderWonState()}
          {isLoggedIn && gameState === 'lost' && renderLostState()}
          {isLoggedIn && gameState === 'cooldown' && renderCooldownState()}
          
          {/* Demo grid for guests */}
          {!isLoggedIn && (
            <div className="grid grid-cols-6 gap-2 opacity-30 blur-[2px]">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-gradient-to-br from-baucis-green-500 to-baucis-green-700" />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

