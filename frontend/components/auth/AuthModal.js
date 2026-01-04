'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

export default function AuthModal() {
  const t = useTranslations('auth');
  const { isAuthModalOpen, authModalView, closeAuthModal } = useAuth();

  if (!isAuthModalOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={closeAuthModal}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white rounded-t-3xl border-b border-baucis-green-100 px-6 py-4 flex items-center justify-between z-10">
            <h2 
              className="text-xl text-baucis-green-800"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {authModalView === 'login' ? t('welcomeBack') : t('joinUs')}
            </h2>
            <button 
              onClick={closeAuthModal}
              className="w-10 h-10 flex items-center justify-center text-baucis-green-600 hover:text-baucis-green-800 hover:bg-baucis-green-50 rounded-full transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Zen Points Teaser */}
          <div className="px-6 pt-4">
            <div className="bg-gradient-to-r from-baucis-green-50 to-baucis-pink-50 rounded-xl p-4 flex items-center space-x-3">
              <div className="w-12 h-12 bg-baucis-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🧘</span>
              </div>
              <div>
                <p 
                  className="text-baucis-green-800 font-medium text-sm"
                  style={{ fontFamily: 'Libre Baskerville, serif' }}
                >
                  {t('zenPointsTitle')}
                </p>
                <p 
                  className="text-baucis-green-600 text-xs"
                  style={{ fontFamily: 'Crimson Text, serif' }}
                >
                  {t('zenPointsDesc')}
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6">
            {authModalView === 'login' ? (
              <LoginForm />
            ) : (
              <RegisterForm />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

