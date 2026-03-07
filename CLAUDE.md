# Baucis Zen - Claude Context

> Docs: `docs/SUMMARY.md` | Diagrams: `docs/ARCHITECTURE.md` | Guide: `docs/MANUAL.md`

## MCP Servers & Skills

### MCP Servers (configured in `.mcp.json`)
| Server | Type | Purpose |
|--------|------|---------|
| `neon` | HTTP (`mcp.neon.tech`) | Database inspection, SQL queries, branch management (OAuth - no API key) |
| `railway` | stdio (`@railway/mcp-server`) | Backend deployment, logs, service management |
| `playwright` | stdio (`@playwright/mcp`) | E2E browser testing, screenshots, UI automation |

### GitHub Access (via `gh` CLI, not MCP)
- **CLI**: `gh` (GitHub CLI v2.87+) authenticated with PAT
- **Auth**: Token stored in keyring via `gh auth login`
- **Repo**: `PhilemonBaucis/Baucis-Zen` (public monorepo)
- **Usage**: `gh repo`, `gh pr`, `gh issue` commands via Bash tool

### Skills (load before using)
| Skill | Path | When to Load |
|-------|------|--------------|
| Neon DB | `~/.claude/skills/neon-db/SKILL.md` | Before database queries or inspection |
| Clerk Auth | `~/.claude/skills/clerk-auth/SKILL.md` | Before auth implementation or debugging |
| Vercel Deploy | `~/.claude/skills/vercel-deploy/SKILL.md` | Before frontend deployment |
| Railway Deploy | `~/.claude/skills/railway-deploy/SKILL.md` | Before backend deployment |
| Playwright | `~/.claude/skills/playwright-testing/SKILL.md` | Before E2E testing |

### Environment Variables Required
```env
# MCP: Neon - uses OAuth via HTTP, no API key needed
# MCP: Railway - uses OAuth via CLI login, no API key needed
# MCP: Playwright - local, no key needed

# GitHub: gh CLI authenticated via `gh auth login --with-token`
# Token stored in docs/.env (gitignored)

# Deployment: Vercel (CLI)
VERCEL_TOKEN=...
```

## Project Overview
3D e-commerce platform with international scalability (Albania/Kosovo focus, EU expansion planned).

## Tech Stack
- **Frontend**: Next.js 15 (App Router), Tailwind CSS, Spline 3D, Mapbox
- **Mobile**: React Native (Expo), NativeWind, Clerk Expo SDK
- **Backend**: Medusa v2.11.3 (headless commerce)
- **Database**: Neon (Serverless PostgreSQL) - MCP connected via `mcp.neon.tech` (HTTP/OAuth)
- **Cache**: Redis (Railway)
- **Storage**: Cloudflare R2
- **Auth**: Clerk (Google, Apple, Email)
- **Email**: Gmail API (service account)
- **i18n**: next-intl (8 languages: en, de, fr, it, es, tr, el, sq)

## Project Structure
```
Baucis-Zen/              # Monorepo (PhilemonBaucis/Baucis-Zen)
  frontend/              # Next.js storefront
    app/[locale]/        # Locale-aware routing
    app/api/             # API routes (orders, addresses)
    components/          # React components
    lib/                 # SDK, data fetching, transformers
    messages/            # UI translations (8 JSON files)

  backend/               # Medusa backend
    src/api/             # Custom API routes
    src/lib/             # Rate limiter, email service, utils
    src/scripts/         # Google Sheets sync, translations
    src/subscribers/     # Event handlers (emails, Zen Points)

  mobile/                # React Native (Expo) app
    app/                 # Expo Router screens
      (tabs)/            # Tab navigation (Shop, Cart, Zen Points, Account)
      (auth)/            # Sign in/up screens
      products/          # Product detail
    lib/                 # API client, transformers, utils
    store/               # Zustand state (auth, cart, config)

  agents/                # Orchestra agent configs
  .orchestra/            # Orchestration state
```

## Key Commands
```bash
# Frontend
cd frontend && npm run dev

# Backend
cd backend && npm run dev

# Mobile (iOS/Android)
cd mobile && npx expo start

# Sync products from Google Sheets
cd backend && npx medusa exec src/scripts/sheets-sync.ts

# Run database migrations
cd backend && npx medusa db:migrate

# GitHub
gh repo view PhilemonBaucis/Baucis-Zen
gh pr list
gh issue list
```

## Important Patterns
- **Prices**: Stored in whole euros (NOT cents - do not divide by 100)
- **Next.js 15 params**: Always `await params` (they're Promises)
- **Auth**: Clerk JWT in `Authorization: Bearer <token>` header
- **Protected endpoints**: Use `verifyClerkToken()` + `requireClerkAuth()`
- **Bilingual emails**: Albanian for AL/XK, English otherwise
- **Mobile API**: Uses direct fetch (not Medusa SDK - ESM incompatible with RN)
- **Order discounts**: NEVER recalculate - always read stored value from metadata
  - `applyDiscount()` is only for live cart/product display
  - Completed orders: read from `order.metadata.zen_tier_discount`
  - Order confirmation modal: use `appliedDiscount` state (stored at checkout)
- **Tier discount hook**: `useTierDiscount()` returns `tierColor` (singular, pre-resolved object), NOT `tierColors`
  ```js
  const { tierColor, currentTier, hasDiscount, discountPercent, applyDiscount } = useTierDiscount();
  // tierColor = { bg: '#...', text: '#...', border: '#...', icon: '...' }
  // applyDiscount() - ONLY use for live cart, NOT for completed orders
  ```
- **React StrictMode**: useEffect runs twice in dev mode - use refs to prevent duplicate API calls
  ```js
  const createdRef = useRef(false);
  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;
    // API call here
  }, [deps]);
  ```
- **Medusa v2.11.3 Types**: Module service interfaces are NOT exported from `@medusajs/framework/types`
  - DO NOT import: `ICustomerModuleService`, `ICartModuleService`, `IOrderModuleService`, `ExecArgs`, `MedusaContainer`
  - Let TypeScript infer types from `container.resolve(Modules.CUSTOMER)` calls
  - Scripts use `{ container: any }` instead of `ExecArgs`

## Current Features
- Clerk auth with Medusa customer sync
- Zen Points loyalty (tiers: Seed/Sprout/Blossom/Lotus)
- Phone verification (Twilio)
- COD payment (Albania only)
- POK Pay card payments (Albania/Kosovo only)
- Shipping calculation (Ultra C.E.P rates: Tirana 250 ALL, Albania 360 ALL, Kosovo €7)
- Memory game (+10 points daily)
- EU legal compliance pages

## Zen Points System
**Earning Points:**
- **Orders**: 1 point per €10 spent (calculated on original price, excluding shipping)
- **Account Creation**: 50 points signup bonus (via `/store/customers/sync`)
- **Memory Game**: +10 points per daily win

**Tiers & Discounts:**
| Tier | Points | Discount |
|------|--------|----------|
| Seed | 0-99 | 0% |
| Sprout | 100-249 | 5% |
| Blossom | 250-499 | 10% |
| Lotus | 500+ | 15% |

**Implementation:**
- Subscriber: `src/subscribers/zen-points-award.ts` (on `order.placed`) - **sole source of truth**
- Config: `src/lib/zen-points-config.ts`
- Customer metadata: `customer.metadata.zen_points`

**Points Animation (frontend):**
- `triggerPointsAnimation(pointsAwarded, newBalance?)` in `auth-context.js`
- Shows gold floating "+X" animation on `ZenPointsBadge` component
- Checkout: Uses locally calculated `potentialPoints` (1 point per €10)
- Memory Game: Uses `points_awarded` from API response
- **Important**: Subscriber awards points, frontend only shows animation
  - DO NOT call `/store/zen-points/award` from frontend (causes double-awarding)
  - Animation refreshes customer data after 3 seconds to get actual balance

**Discount at Checkout (stored, never recalculated):**
- API: `POST /store/cart/apply-tier-discount` (called before `cart.complete()`)
- Stores discount in `cart.metadata.zen_tier_discount`
- Frontend stores result in `appliedDiscount` state for immediate display
- After order completion: `PATCH /store/orders/:id/metadata` transfers discount + shipping to order
- **Important**: Discounts are STORED at purchase time - never recalculate from current tier
  - Order confirmation modal: uses `appliedDiscount` state (not `applyDiscount()`)
  - Order history/detail pages: read from `order.metadata.zen_tier_discount`
  - Invoice PDF: reads from cart metadata (email) or order metadata (on-demand)
  - Email subscriber: reads from `cart.metadata` via `order.cart_id` (timing fix)

**Order Metadata PATCH** (`/store/orders/:id/metadata`):
- Accepts both `zen_tier_discount` AND `custom_shipping` (either or both)
- `custom_shipping`: `{ priceEUR, zoneName, deliveryTime }` for display
- Used after cart completion to persist checkout data to order

**Price Rounding**:
- Use `round2()` helper: `Math.round(n * 100) / 100` for consistent 2-decimal rounding
- Applied in: checkout page, order confirmation, invoice, order detail pages
- Prevents floating-point precision issues (e.g., 3.8100000001 → 3.81)

## Order System
- **Order history** (Account > Orders - clickable with delivery estimates)
- **Order detail page** (`/account/orders/[id]` - animated timeline, items, totals)
- **Invoice generation** (server-side jsPDF, Albanian language, VAT from tax regions)
- **Fulfillment** (manual provider, ready for logistics API)
- **Status emails** (order confirmed, shipped, delivered with PDF invoice)
- **Order timeline**: 3 stages (Processing → Shipped → Delivered)
  - No "Pending" status - all new orders start at "Processing"

**Order & Invoice Numbering:**
| Document | Format | Example |
|----------|--------|---------|
| Order Number | `BZ-YYYY-XXXXX` | BZ-2025-00042 |
| Invoice Number | `IN-YYYY-XXXXX` | IN-2025-00042 |

- `BZ` = Baucis Zen prefix for orders
- `IN` = Invoice prefix
- `YYYY` = Year of order/invoice
- `XXXXX` = Zero-padded display_id from Medusa
- Generated via `generateOrderNumber()` / `generateInvoiceNumber()` in `invoice-pdf-service.ts`
- Frontend helper: `formatOrderNumber(order)` in order pages

## Mobile App (baucis-mobile)
**Status**: Phase 1 complete (foundation)

**Tech Stack**:
- Expo SDK 54+ with Expo Router
- NativeWind (Tailwind for RN)
- Zustand + TanStack Query
- @clerk/clerk-expo

**Screens Implemented**:
- Shop (product grid)
- Cart (add/remove items)
- Zen Points (loyalty dashboard)
- Account (profile, sign out)
- Product detail
- Sign in/up (Google, Apple, Email)

**Pending Mobile Work**:
- [ ] Fix web platform ESM error (mobile works)
- [ ] Checkout flow (address, shipping, payment)
- [ ] Order history
- [x] Push notifications backend (`/store/customers/push-token`)
- [ ] Push notifications frontend (expo-notifications)
- [ ] i18n integration
- [ ] App Store submission

## Order Flow & Subscribers
```
order.placed         → order-confirmation-email.ts + zen-points-award.ts
order.fulfillment_created → order-shipped-email.ts
order.completed      → order-delivered-email.ts
```

## Key API Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /store/customers/orders` | Customer order history (auth required) |
| `GET /store/orders/:id/invoice` | PDF invoice download (backend, Albanian) |
| `GET /api/orders/[id]` | Single order details (frontend route) |
| `GET /api/orders/[id]/invoice` | PDF invoice proxy to backend |
| `POST /store/shipping/calculate` | Shipping cost calculation |
| `GET /store/payment/available` | Payment methods for cart |
| `POST /store/customers/sync` | Sync Clerk user to Medusa (awards signup bonus) |
| `POST /store/customers/push-token` | Register/update push notification token (mobile) |
| `POST /store/zen-points/award` | Award zen points for order (backend only - DO NOT call from frontend) |
| `POST /store/cart/apply-tier-discount` | Apply Zen tier discount to cart before checkout |
| `PATCH /store/orders/:id/metadata` | Transfer discount + shipping metadata to order |
| `POST /store/pok/create-order` | Create POK SDK Order (amount in EUR, not cents!) |
| `GET /store/pok/status/:orderId` | Poll POK order completion status |
| `POST /store/pok/webhook` | Handle POK payment status webhooks |

## POK Pay Integration

**Overview**: POK Pay (Albanian NEO Bank) for credit/debit card payments in Albania/Kosovo. Uses POK's hosted checkout page in a cropped iframe.

**Why Iframe**: POK requires client-side card encryption via Flex Microform (not available). Direct tokenization via `/credit-debit-cards/tokenize-guest-card` needs JWE encryption. Solution: Use POK's hosted checkout (`confirmUrl`) with CSS cropping to hide branding.

**Flow**:
1. User selects "Pay Online" → POK checkout iframe appears (slide-down animation)
2. Backend creates SDK Order → returns `confirmUrl`
3. Frontend displays POK hosted checkout in cropped iframe (hides header/footer)
4. User enters card in POK's form → POK handles 3DS internally
5. Frontend polls `/store/pok/status/{orderId}` every 2 seconds
6. When payment completes → Complete Medusa cart → Show order confirmation

**Amount Calculation** (critical):
```typescript
// In create-order/route.ts
// Medusa stores unit_price in whole EUROS (not cents!)
const itemsTotal = items.reduce((sum, item) =>
  sum + item.unit_price * item.quantity, 0);  // Already in EUR

// Frontend passes shipping/discount (not in cart metadata yet)
const tierDiscount = body.discount_amount ?? 0;
const shippingCost = body.shipping_amount ?? 0;
const totalAmount = itemsTotal - tierDiscount + shippingCost;

// POK API expects EUROS (not cents) - don't multiply by 100!
createSdkOrder(totalAmount, currency, cartId);  // e.g., 8.15 EUR
```

**Backend Files**:
- `src/lib/pok-payment.ts` - POK API client (auth, SDK orders, status polling)
- `src/api/store/pok/create-order/route.ts` - Creates SDK order with correct amount
- `src/api/store/pok/status/[orderId]/route.ts` - Polls order completion status

**Frontend Files**:
- `components/checkout/PokGuestCheckout.js` - Cropped iframe + polling
- `components/checkout/CheckoutForm.js` - Passes shippingAmount/discountAmount props
- `components/checkout/PaymentSelector.js` - COD and POK options

**CSS Cropping** (PokGuestCheckout.js):
```jsx
<div style={{ height: '420px', overflow: 'hidden' }}>
  <iframe
    src={confirmUrl}
    style={{
      height: '600px',
      marginTop: '-90px',   // Hide POK header (logo)
      marginBottom: '-90px' // Hide POK footer (app links)
    }}
  />
</div>
```

**POK API Limitations**:
- No `shippingAmount` field - shows "Shipping: 0.00 EUR" in their checkout
- Amount must be in euros (decimal), not cents
- No way to customize their hosted checkout UI

**Environment Variables**:
```env
POK_API_URL=https://api.pokpay.io           # Production
# POK_API_URL=https://api-staging.pokpay.io # Staging
POK_MERCHANT_ID=xxx
POK_API_KEY=xxx
POK_API_SECRET=xxx
```

**Availability**: Requires phone verification + Albania/Kosovo shipping address.

**Fallback**: If `/store/payment/available` API fails, both COD and POK are enabled by default.

## i18n Translation Structure

**Payment Method Translations** (in `messages/*.json` under `checkout.paymentMethod`):
```json
{
  "checkout": {
    "paymentMethod": {
      "title": "Choose Payment Method",
      "subtitle": "Select how you want to pay",
      "digital": {
        "title": "Pay Online",
        "subtitle": "Visa, Mastercard via POK",
        "available": "AVAILABLE",
        "confirmButton": "Continue with Card Payment",
        "securedBy": "Secured by POK - Bank of Albania"
      },
      "cod": {
        "title": "Cash on Delivery",
        "subtitle": "Pay when you receive",
        "available": "AVAILABLE",
        "selectButton": "Confirm Cash on Delivery"
      },
      "stripe": {
        "title": "Credit / Debit Card",
        "subtitle": "Secure payment via Stripe",
        "redirect": "You'll be redirected...",
        "securedBy": "Secured by"
      }
    }
  }
}
```

**Translation Usage** (PaymentSelector.js):
- Always use nested paths: `t('paymentMethod.title')` NOT `t('paymentMethod')`
- Object keys like `paymentMethod` resolve to objects, not strings
- Use fallback: `{t('paymentMethod.cod.title') || 'Cash on Delivery'}`

## Pending Work
- [x] POK Pay integration (Albania/Kosovo)
- [ ] Stripe payment integration (EU)
- [x] Zen Points discount at checkout (via cart metadata + order metadata transfer)
- [x] Gmail domain-wide delegation setup (working)
- [ ] SMS tracking notifications
- [ ] Logistics API integration (Ultra C.E.P)

## Invoice & Email Setup

**Invoice PDF** (single source of truth in backend):
- `src/lib/invoice-pdf-service.ts` - PDF generation service (jsPDF)
- `src/api/store/orders/[id]/invoice/route.ts` - Backend endpoint for PDF download
- `app/api/orders/[id]/invoice/route.js` - Frontend proxy to backend
- Albanian language, VAT breakdown (AL=20%, XK=18%)
- **Logo**: PNG logo on right side of header (base64 embedded), "Baucis Zen" text on left
- Reads discount from: order metadata → cart metadata (fallback for email timing)
- `orderToInvoiceData(order, cartDiscount?)` accepts optional cart discount
- **Filename**: `Fatura - FirstName LastName.pdf` (e.g., "Fatura - Philipp Koro.pdf")
- **Invoice number in PDF**: `IN-YYYY-XXXXX` format (e.g., "FATURE Nr. IN-2025-00042")
- **Order reference in PDF**: `BZ-YYYY-XXXXX` format (shown below invoice number)

**Email Templates** (`baucis-backend/src/lib/email-templates.ts`):
- Clean professional design, no emojis
- Text header "Baucis Zen" (no logo image)
- No Zen Points box in order confirmation
- Invoice reference as plain paragraph text
- Brand green header with white text

**Email Service** (`baucis-backend`):
- `src/lib/email-service.ts` - Gmail API with attachment support
- `src/subscribers/order-confirmation-email.ts` - Sends PDF with order confirmation
  - Reads discount from `cart.metadata` (via `order.cart_id`) since order metadata not yet set
  - Passes `discountedTotal` to email template and `cartDiscount` to invoice generator
- **Subject**: "Porosia u Konfirmua - Baucis Zen" (Albanian) / "Order Confirmed - Baucis Zen" (English)
- **Contact**: info@bauciszen.com

**Order Totals Structure** (Medusa v2):
```js
order.summary?.totals?.current_order_total  // Primary
order.summary?.current_order_total          // Fallback
order.total                                  // Legacy fallback
order.metadata?.zen_tier_discount?.amount   // Zen tier discount (if applied)
```

**Gmail API Setup** (requires Google Workspace):
1. Google Cloud Console: Enable Gmail API, enable domain-wide delegation on service account
2. Google Workspace Admin: Security > API controls > Domain-wide Delegation > Add service account Client ID with scope `https://www.googleapis.com/auth/gmail.send`
3. Environment variables:
   ```env
   GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
   GOOGLE_CLIENT_ID=114328392437761763727
   GMAIL_USER_EMAIL=admin@bauciszen.com        # Real user to impersonate (for auth)
   GMAIL_FROM_EMAIL=info@bauciszen.com          # Optional: alias for From header
   ```
