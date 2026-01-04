import '../globals.css';
import { CartProvider } from '@/lib/cart-context';
import { AuthProvider } from '@/lib/auth-context';
import { StoreConfigProvider } from '@/lib/store-config';
import { ToastProvider } from '@/components/ui/Toast';
import CartDrawer from '@/components/cart/CartDrawer';
import CookieConsent from '@/components/ui/CookieConsent';
import ChatBot from '@/components/chat/ChatBot';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { locales } from '@/i18n/request';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });
  
  return {
    title: 'Baucis Zen',
    description: 'Discover the art of matcha and wellness. Premium ceremonial grade matcha, wellness kits, and mindful living essentials for your zen journey.',
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon.svg', type: 'image/svg+xml' }
      ],
      shortcut: '/favicon.ico',
      apple: '/Baucis Zen - Logo.svg',
    },
  };
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <StoreConfigProvider>
            <AuthProvider>
              <CartProvider>
                <ToastProvider>
                  {children}
                  <CartDrawer />
                  <CookieConsent />
                  <ChatBot />
                </ToastProvider>
              </CartProvider>
            </AuthProvider>
          </StoreConfigProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
