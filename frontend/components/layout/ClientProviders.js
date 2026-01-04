'use client';

import { useEffect, useState } from 'react';
import { CartProvider } from '@/lib/cart-context';
import { AuthProvider } from '@/lib/auth-context';
import { StoreConfigProvider } from '@/lib/store-config';
import { ToastProvider } from '@/components/ui/Toast';
import CartDrawer from '@/components/cart/CartDrawer';
import CookieConsent from '@/components/ui/CookieConsent';
import ChatBot from '@/components/chat/ChatBot';
import RootErrorBoundary from '@/components/layout/RootErrorBoundary';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

/**
 * Client-side providers wrapper with error boundary.
 * This ensures that any JavaScript errors are caught and a friendly
 * error message is shown instead of a blank screen.
 *
 * CRITICAL FOR MOBILE: We add an effect to mark hydration complete
 * so the CSS loading spinner is hidden.
 */
export default function ClientProviders({ children }) {
  const [mounted, setMounted] = useState(false);

  // Mark as hydrated when component mounts (JavaScript executed successfully)
  useEffect(() => {
    setMounted(true);

    // Remove loading class and mark hydration complete
    try {
      document.body?.classList.remove('js-loading');
      document.body?.setAttribute('data-hydrated', 'true');
    } catch (e) {
      // Ignore - body might not be accessible yet
    }

    // Log successful hydration for debugging
    console.log('[ClientProviders] React hydration complete');
  }, []);

  return (
    <RootErrorBoundary>
      <StoreConfigProvider>
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              {children}
              {/* Wrap optional UI components in error boundaries so they don't break the main content */}
              <ErrorBoundary fallback={null}>
                <CartDrawer />
              </ErrorBoundary>
              <ErrorBoundary fallback={null}>
                <CookieConsent />
              </ErrorBoundary>
              <ErrorBoundary fallback={null}>
                <ChatBot />
              </ErrorBoundary>
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </StoreConfigProvider>
    </RootErrorBoundary>
  );
}
