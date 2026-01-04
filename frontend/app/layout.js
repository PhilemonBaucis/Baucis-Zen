import { ClerkProvider } from '@clerk/nextjs';

// Viewport meta tag for mobile browsers
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Root layout - wraps everything with ClerkProvider
export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      {children}
    </ClerkProvider>
  );
}
