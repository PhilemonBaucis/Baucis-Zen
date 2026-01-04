import { NextResponse } from 'next/server'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, countryToLocale } from './i18n/request';

// Create the next-intl middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed' // Only show locale in URL when not default
});

// Define public routes (accessible without authentication)
const isPublicRoute = createRouteMatcher([
  '/',
  '/:locale',
  '/:locale/products(.*)',
  '/:locale/checkout(.*)',
  '/:locale/maintenance',
  '/maintenance',
  '/api(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true'
  const bypassKey = request.cookies.get('bypass_maintenance')?.value
  const expectedKey = process.env.MAINTENANCE_BYPASS_KEY
  const url = request.nextUrl

  // Allow static assets and internal Next.js routes
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.includes('.') // files like favicon.ico, images, etc.
  ) {
    return NextResponse.next()
  }

  // Handle maintenance mode
  if (isMaintenanceMode) {
    // Allow bypass with secret cookie
    if (bypassKey && bypassKey === expectedKey) {
      // Continue to intl middleware
    } else if (url.pathname === '/maintenance' || url.pathname.match(/^\/[a-z]{2}\/maintenance$/)) {
      return intlMiddleware(request)
    } else {
      // Redirect to maintenance page
      return NextResponse.redirect(new URL('/maintenance', request.url))
    }
  }

  // IP-based language detection for first visit
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value
  
  if (!localeCookie) {
    // Detect country from headers (works with Vercel, Cloudflare, etc.)
    const country = request.headers.get('x-vercel-ip-country') 
      || request.headers.get('cf-ipcountry')
      || request.geo?.country
      || null;
    
    if (country && countryToLocale[country]) {
      const detectedLocale = countryToLocale[country];
      const response = intlMiddleware(request);
      
      // Set locale cookie for future visits
      response.cookies.set('NEXT_LOCALE', detectedLocale, {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/'
      });
      
      return response;
    }
  }

  return intlMiddleware(request);
});

export const config = {
  // Match all paths except static files
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
    '/(api|trpc)(.*)',
  ]
}
