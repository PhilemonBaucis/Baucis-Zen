'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';

export default function ChatBox({ 
  onClose, 
  messages, 
  onSendMessage, 
  isLoading,
  isZenMoment = false,
  currentProverb = ''
}) {
  const t = useTranslations('chat');
  const { customer } = useAuth();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isZenMoment]);
  
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isZenMoment) return;
    
    onSendMessage(input.trim());
    setInput('');
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getMessageClasses = (role) => {
    if (role === 'user') {
      return 'bg-baucis-green-600 text-white rounded-tr-md';
    }
    return 'bg-white text-baucis-green-700 rounded-tl-md shadow-sm';
  };
  
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes lotus-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes fade-proverb {
          0% { opacity: 0; transform: translateY(5px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-5px); }
        }
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2); opacity: 0; }
        }
      `}} />
      
      <div 
        className="fixed bottom-4 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-baucis-green-100 flex flex-col overflow-hidden animate-[slideUp_0.3s_ease-out]"
        style={{ maxHeight: 'min(520px, calc(100vh - 2rem))' }}
      >
        {/* Header - with Baucis Zen logo */}
        <div className="bg-gradient-to-r from-baucis-green-600 to-baucis-green-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Baucis Zen Logo */}
            <img 
              src="/Baucis Zen - Logo.png" 
              alt="Baucis Zen" 
              className="h-7 w-auto opacity-90"
            />
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
            aria-label={t('close')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-baucis-green-50/30 min-h-[260px]">
          {messages.length === 0 && !isZenMoment ? (
            // Welcome message
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-white shadow-sm flex-shrink-0 flex items-center justify-center border border-baucis-green-100">
                <img src="/Chat/1.png" alt="" className="w-7 h-7 object-contain" />
              </div>
              <div 
                className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm max-w-[80%] text-sm text-baucis-green-700 border border-baucis-green-50"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('greeting', { name: customer?.first_name || t('friend') })}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div 
                key={index}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar - white background, bigger mascot */}
                {msg.role === 'assistant' && (
                  <div className="w-9 h-9 rounded-full bg-white shadow-sm flex-shrink-0 flex items-center justify-center border border-baucis-green-100">
                    <img src="/Chat/1.png" alt="" className="w-7 h-7 object-contain" />
                  </div>
                )}
                
                {/* Message bubble */}
                <div 
                  className={`px-4 py-3 rounded-2xl max-w-[80%] text-sm ${getMessageClasses(msg.role)}`}
                  style={{ fontFamily: 'Crimson Text, serif' }}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          
          {/* Zen Moment - proverbs display while waiting */}
          {isZenMoment && (
            <div className="flex flex-col items-center py-4">
              {/* Zen meditation animation */}
              <div className="relative w-20 h-20 mb-4">
                {/* Ripple rings */}
                <div className="absolute inset-0 rounded-full border-2 border-baucis-green-300/50 animate-[ripple_2s_ease-out_infinite]" />
                <div className="absolute inset-0 rounded-full border-2 border-baucis-green-300/50 animate-[ripple_2s_ease-out_infinite_0.5s]" />
                <div className="absolute inset-0 rounded-full border-2 border-baucis-green-300/50 animate-[ripple_2s_ease-out_infinite_1s]" />
                
                {/* Center lotus */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-baucis-green-100 to-baucis-pink-100 flex items-center justify-center shadow-lg animate-[breathe_3s_ease-in-out_infinite]">
                    <svg className="w-8 h-8 text-baucis-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18c-4 0-6-3-6-6 0-4 3-8 6-10 3 2 6 6 6 10 0 3-2 6-6 6z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v3" />
                      {/* Extra petals */}
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 14c-2-1-3-3-3-5 0-3 3-6 6-7" opacity="0.5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 14c2-1 3-3 3-5 0-3-3-6-6-7" opacity="0.5" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Zen title */}
              <p 
                className="text-sm font-medium text-baucis-green-700 mb-2"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {t('zenMoment')}
              </p>
              
              {/* Proverb display */}
              <div 
                className="bg-white/80 backdrop-blur-sm rounded-xl px-5 py-4 shadow-sm border border-baucis-green-100/50 max-w-[280px] text-center"
                key={currentProverb}
              >
                <p 
                  className="text-sm text-baucis-green-600 italic leading-relaxed animate-[fade-proverb_2.5s_ease-in-out]"
                  style={{ fontFamily: 'Crimson Text, serif' }}
                >
                  "{currentProverb}"
                </p>
              </div>
              
              {/* Subtle hint */}
              <p 
                className="text-xs text-baucis-green-400 mt-3"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('contemplatingQuestion')}
              </p>
            </div>
          )}
          
          {/* Loading indicator - AI is responding */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-white shadow-sm flex-shrink-0 flex items-center justify-center border border-baucis-green-100">
                <img src="/Chat/1.png" alt="" className="w-7 h-7 object-contain" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-baucis-green-50">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-baucis-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-baucis-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-baucis-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-baucis-green-500 ml-1" style={{ fontFamily: 'Crimson Text, serif' }}>{t('typing')}</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input area */}
        <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-baucis-green-100">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('placeholder')}
              disabled={isLoading || isZenMoment}
              className="flex-1 px-4 py-2.5 bg-baucis-green-50 rounded-full text-sm placeholder-baucis-green-400 focus:outline-none focus:ring-2 focus:ring-baucis-green-500 focus:bg-white transition-all disabled:opacity-50"
              style={{ fontFamily: 'Crimson Text, serif' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || isZenMoment}
              className="p-2.5 bg-baucis-green-600 text-white rounded-full hover:bg-baucis-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-baucis-green-500 focus:ring-offset-2"
              aria-label={t('send')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
