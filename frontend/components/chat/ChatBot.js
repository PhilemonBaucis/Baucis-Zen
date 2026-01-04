'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { SignInButton } from '@clerk/nextjs';
import Image from 'next/image';
import ChatMascot from './ChatMascot';
import ChatBox from './ChatBox';

const ZEN_DELAY_MS = 10000; // 10 seconds zen moment before answering

// Lotus SVG icon (same as tier icon)
const LotusIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18c-4 0-6-3-6-6 0-4 3-8 6-10 3 2 6 6 6 10 0 3-2 6-6 6z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v3" />
  </svg>
);

export default function ChatBot() {
  const t = useTranslations('chat');
  const locale = useLocale();
  const pathname = usePathname();
  const { isLoggedIn, customer, loading } = useAuth();
  const { isDrawerOpen } = useCart();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWinking, setIsWinking] = useState(false);
  
  // Zen moment state
  const [isZenMoment, setIsZenMoment] = useState(false);
  const [currentProverb, setCurrentProverb] = useState('');
  const [proverbIndex, setProverbIndex] = useState(0);
  const zenTimerRef = useRef(null);
  const proverbIntervalRef = useRef(null);
  const pendingMessageRef = useRef('');
  
  // Winking animation for sign-in modal mascot
  useEffect(() => {
    if (!showSignInPrompt) return;
    
    const winkInterval = setInterval(() => {
      setIsWinking(true);
      setTimeout(() => setIsWinking(false), 200);
    }, 3000);
    
    return () => clearInterval(winkInterval);
  }, [showSignInPrompt]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (zenTimerRef.current) clearTimeout(zenTimerRef.current);
      if (proverbIntervalRef.current) clearInterval(proverbIntervalRef.current);
    };
  }, []);
  
  const handleMascotClick = useCallback(() => {
    if (loading) return;
    
    if (!isLoggedIn) {
      setShowSignInPrompt(true);
    } else {
      setIsOpen(true);
      setShowSignInPrompt(false);
    }
  }, [isLoggedIn, loading]);
  
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setShowSignInPrompt(false);
    // Clear any pending zen moment
    if (zenTimerRef.current) {
      clearTimeout(zenTimerRef.current);
      zenTimerRef.current = null;
    }
    if (proverbIntervalRef.current) {
      clearInterval(proverbIntervalRef.current);
      proverbIntervalRef.current = null;
    }
    setIsZenMoment(false);
    pendingMessageRef.current = '';
  }, []);

  // Send message to AI
  const sendToAI = useCallback(async (message) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          locale,
          history: messages.slice(-10),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: t('rateLimit'),
          }]);
        } else {
          throw new Error(errorData.error || 'Failed to get response');
        }
      } else {
        const data = await response.json();
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t('error'),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [locale, messages, t]);

  // Get proverbs from translations
  const proverbs = t.raw('proverbs') || [];
  
  // Handle sending a message
  const handleSendMessage = useCallback((content) => {
    if (!content.trim() || isLoading || isZenMoment) return;
    
    const trimmedContent = content.trim();
    
    // Add user message to display immediately
    setMessages(prev => [...prev, { role: 'user', content: trimmedContent }]);
    
    // Store the message
    pendingMessageRef.current = trimmedContent;
    
    // Start zen moment
    setIsZenMoment(true);
    
    // Pick a random starting proverb
    const proverbList = Array.isArray(proverbs) ? proverbs : [];
    if (proverbList.length > 0) {
      const startIndex = Math.floor(Math.random() * proverbList.length);
      setProverbIndex(startIndex);
      setCurrentProverb(proverbList[startIndex]);
      
      // Cycle through proverbs every 2.5 seconds
      proverbIntervalRef.current = setInterval(() => {
        setProverbIndex(prev => {
          const nextIndex = (prev + 1) % proverbList.length;
          setCurrentProverb(proverbList[nextIndex]);
          return nextIndex;
        });
      }, 2500);
    }
    
    // After 10 seconds, end zen moment and send to AI
    zenTimerRef.current = setTimeout(() => {
      if (proverbIntervalRef.current) {
        clearInterval(proverbIntervalRef.current);
        proverbIntervalRef.current = null;
      }
      setIsZenMoment(false);
      sendToAI(pendingMessageRef.current);
      pendingMessageRef.current = '';
    }, ZEN_DELAY_MS);
    
  }, [isLoading, isZenMoment, sendToAI, proverbs]);
  
  if (typeof window === 'undefined') return null;
  
  // Hide on checkout page, maintenance page, or when cart drawer is open
  const isCheckoutPage = pathname?.includes('/checkout');
  const isMaintenancePage = pathname?.includes('/maintenance');
  if (isDrawerOpen || isCheckoutPage || isMaintenancePage) return null;
  
  // Sign-in prompt for guests - compact brand style
  if (showSignInPrompt) {
    return (
      <>
        <ChatMascot onClick={handleMascotClick} />
        
        {/* Sign-in prompt modal - compact brand style */}
        <div className="fixed bottom-36 right-6 z-50 w-[280px] max-w-[calc(100vw-3rem)] animate-[slideUp_0.3s_ease-out]">
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}} />
          <div className="bg-white rounded-2xl shadow-xl border border-baucis-green-100 overflow-hidden">
            {/* Header with logo */}
            <div className="bg-gradient-to-r from-baucis-green-600 to-baucis-green-700 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src="/Baucis Zen - Logo.png" 
                  alt="Baucis Zen" 
                  className="h-7 w-auto opacity-90"
                />
              </div>
              <button
                onClick={handleClose}
                className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                aria-label={t('close')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-5 text-center">
              {/* Small mascot with white background */}
              <div className="relative w-20 h-20 mx-auto mb-3">
                {/* White circle background */}
                <div className="absolute inset-0 bg-white rounded-full shadow-md border border-baucis-green-100" />
                <Image
                  src="/Chat/1.png"
                  alt="Baucis"
                  fill
                  className="object-contain relative z-10"
                  sizes="80px"
                />
                <div className="absolute inset-0 z-10">
                  <Image
                    src={isWinking ? "/Chat/4.png" : "/Chat/3.png"}
                    alt=""
                    fill
                    className="object-contain"
                    sizes="80px"
                  />
                </div>
                <div className="absolute inset-0 z-10">
                  <Image
                    src="/Chat/2.png"
                    alt=""
                    fill
                    className="object-contain"
                    sizes="80px"
                  />
                </div>
              </div>
              
              <p 
                className="text-sm text-baucis-green-600 mb-4 leading-relaxed"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('signInRequired')}
              </p>
              
              {/* Sign in button */}
              <SignInButton mode="modal">
                <button 
                  className="w-full py-2.5 bg-gradient-to-r from-baucis-green-500 to-baucis-green-600 text-white rounded-full text-sm hover:from-baucis-green-600 hover:to-baucis-green-700 transition-all duration-300 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-baucis-green-400 focus:ring-offset-2"
                  style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.05em' }}
                >
                  {t('signIn')}
                </button>
              </SignInButton>
              
              {/* Bonus hint with lotus icon */}
              <p 
                className="text-xs text-baucis-green-500 mt-3 flex items-center justify-center gap-1"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                <LotusIcon className="w-3.5 h-3.5 text-baucis-pink-400" />
                {t('signInBonus')}
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  // Chat box for authenticated users
  if (isOpen && isLoggedIn) {
    return (
      <ChatBox
        onClose={handleClose}
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        isZenMoment={isZenMoment}
        currentProverb={currentProverb}
      />
    );
  }
  
  // Default: show mascot
  return <ChatMascot onClick={handleMascotClick} />;
}
