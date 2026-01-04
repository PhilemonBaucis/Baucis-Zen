import { ClerkProvider } from '@clerk/nextjs';

// Root layout - wraps everything with ClerkProvider
export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      {children}
    </ClerkProvider>
  );
}
