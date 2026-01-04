import '../globals.css';
import ClientProviders from '@/components/layout/ClientProviders';
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
      {/* Add inline script to handle loading state - runs before React hydrates */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Add loading class immediately
              document.body?.classList.add('js-loading');
              // Remove it once DOM is fully loaded (before React hydrates)
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                  document.body.classList.remove('js-loading');
                  document.body.setAttribute('data-hydrated', 'true');
                });
              } else {
                // Already loaded
                document.body?.classList.remove('js-loading');
                document.body?.setAttribute('data-hydrated', 'true');
              }
              // Failsafe: Remove loading class after 3 seconds no matter what
              setTimeout(function() {
                document.body?.classList.remove('js-loading');
                document.body?.setAttribute('data-hydrated', 'true');
              }, 3000);
            `,
          }}
        />
      </head>
      <body className="js-loading" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <ClientProviders>
            {children}
          </ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
