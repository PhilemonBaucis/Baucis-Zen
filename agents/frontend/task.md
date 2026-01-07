# Frontend Agent Tasks

## Current Tasks

### Spline Mobile Browser Optimization

The current IntroAnimation.js already skips Spline on mobile browsers and shows a fallback logo, but improvements are needed:

- [x] **Review Spline mobile detection logic** in `frontend/components/ui/IntroAnimation.js` (lines 42-99):
  - Added `navigator.userAgentData` API support for more reliable detection
  - Expanded mobile UA regex to include Samsung Internet browser
  - Verified iPad with iOS 13+ detection via `MacIntel` + `maxTouchPoints`

- [x] **Improve fallback experience** when Spline is skipped:
  - Added animated gradient background with brand colors (#4caf50, #81c784)
  - Floating particle effects for visual engagement
  - Logo breathing animation with drop shadow
  - Loading bar indicator for better UX feedback

- [x] **Add explicit iOS Safari detection** since iOS has WebGL quirks:
  - Added `isIOSSafari` detection: Safari on iOS excluding Chrome/CriOS/FxiOS/EdgiOS
  - Flag is available in `deviceInfo` for future iOS Safari-specific handling

Reference documentation: `~/public/Sources/spline-documentation.md`

## Completed Tasks
- [x] Verify NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is correctly passed to all API requests
- [x] Check SSR/server-side API calls include publishable key header
- [x] Test frontend connection to backend

## Investigation Results

### Frontend Code Analysis
The frontend code is correctly configured to pass the publishable key:

1. **SDK Configuration** (`lib/config.js`): Correctly initializes Medusa SDK with `publishableKey` from environment
2. **SSR Data Fetching** (`lib/data.js`): Uses SDK which automatically includes publishable key header
3. **Client-side Calls** (`lib/cart-context.js`, etc.): All use the SDK with the key
4. **API Routes** (`app/api/*/route.js`): All server-side routes include the `x-publishable-api-key` header

### Root Cause: Configuration Mismatch
The issue is **NOT a code bug** - it's a **key mismatch**:
- The `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` in Vercel doesn't match the actual key in the Medusa backend database
- Backend correctly rejects requests with invalid keys (returning "A valid publishable key is required")
- Frontend falls back to sample products when backend API fails

### Resolution Required (User Action)
1. Get the correct publishable key from Medusa backend:
   - Check the database `api_key` table, OR
   - Run `npx medusa exec backend/src/scripts/create-api-key.ts` to create a new key
2. Update `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` in Vercel with the correct key
3. Redeploy the frontend

## Notes
- Frontend Vercel deployment is live at https://www.baucis-zen.com
- Backend Railway is running at https://baucis-backend-production.up.railway.app
- Mobile app connects successfully because it has the correct publishable key
