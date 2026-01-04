# Baucis Frontend

Next.js 15+ frontend application for the Baucis e-commerce platform.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Internationalization**: next-intl (8 languages)
- **Authentication**: Clerk
- **Backend**: Medusa.js SDK
- **Maps**: Mapbox GL
- **3D Graphics**: Spline

## Supported Languages

- English (en)
- German (de)
- French (fr)
- Italian (it)
- Spanish (es)
- Turkish (tr)
- Greek (el)
- Albanian (sq)

## Prerequisites

- Node.js 18+
- npm or yarn
- Running Medusa backend

## Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Create environment file:

```bash
cp .env.example .env.local
```

3. Configure environment variables:

```env
# Required
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://your-medusa-backend.railway.app
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Maps (optional)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...

# Maintenance Mode (optional)
MAINTENANCE_MODE=false
MAINTENANCE_BYPASS_KEY=your-secret-key
```

## Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Build

Create a production build:

```bash
npm run build
```

## Deployment

The frontend is designed to be deployed on Vercel:

1. Connect your GitHub repository to Vercel
2. Set the root directory to `frontend`
3. Configure environment variables in Vercel dashboard
4. Deploy

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   └── [locale]/          # Localized pages
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── cart/             # Shopping cart
│   ├── chat/             # Chat widget
│   ├── checkout/         # Checkout flow
│   ├── game/             # Gamification features
│   ├── layout/           # Layout components
│   ├── legal/            # Legal pages
│   ├── products/         # Product components
│   ├── sections/         # Page sections
│   ├── ui/               # UI primitives
│   └── zen-points/       # Loyalty program
├── i18n/                  # Internationalization config
├── lib/                   # Utilities and contexts
├── messages/              # Translation files
└── public/                # Static assets
```

## Features

- Multi-language support with IP-based detection
- Responsive mobile-first design
- Shopping cart with persistence
- Checkout with multiple payment options
- User authentication and profiles
- Zen Points loyalty program
- Interactive memory game
- Store locator with maps
- Maintenance mode support
