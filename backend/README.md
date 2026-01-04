# Baucis Backend

Medusa.js e-commerce backend for the Baucis Zen platform.

## Tech Stack

- **Framework**: [Medusa.js 2.x](https://medusajs.com) - Headless commerce engine
- **Database**: PostgreSQL (Neon)
- **Cache/Queue**: Redis (optional, via Upstash)
- **File Storage**: S3-compatible (Cloudflare R2)
- **Auth**: Clerk integration
- **Payments**: POK integration

## Prerequisites

- Node.js 20+
- Yarn package manager
- PostgreSQL database (Neon recommended)
- Environment variables configured

## Project Structure

```
backend/
├── src/
│   ├── admin/          # Admin dashboard customizations
│   ├── api/            # Custom API routes
│   │   ├── admin/      # Admin API endpoints
│   │   ├── store/      # Storefront API endpoints
│   │   ├── middlewares/# Custom middleware
│   │   └── webhooks/   # Webhook handlers
│   ├── jobs/           # Background jobs
│   ├── lib/            # Shared utilities
│   ├── links/          # Module links
│   ├── modules/        # Custom modules
│   ├── scripts/        # CLI scripts
│   ├── subscribers/    # Event subscribers
│   └── workflows/      # Business workflows
├── integration-tests/  # Integration tests
├── scripts/           # Build/deploy scripts
├── Dockerfile         # Railway deployment
├── medusa-config.ts   # Medusa configuration
└── vercel.json        # Admin panel deployment
```

## Environment Variables

Create a `.env` file in this folder with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Redis (optional)
REDIS_URL=redis://...

# JWT & Cookies
JWT_SECRET=your-jwt-secret
COOKIE_SECRET=your-cookie-secret

# CORS
STORE_CORS=http://localhost:3000,https://your-frontend.com
ADMIN_CORS=http://localhost:9000,https://your-admin.com
AUTH_CORS=http://localhost:3000,https://your-frontend.com

# S3 Storage (Cloudflare R2)
S3_FILE_URL=https://your-bucket.r2.dev
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_REGION=auto
S3_BUCKET=your-bucket-name
S3_ENDPOINT=https://account-id.r2.cloudflarestorage.com

# Clerk Auth
CLERK_SECRET_KEY=sk_...

# Payment (POK)
POK_API_KEY=your-pok-key

# Admin Deployment
MEDUSA_BACKEND_URL=https://your-backend.railway.app
DISABLE_ADMIN=true  # Set to false for Vercel admin build
```

## Development

```bash
# Install dependencies
yarn install

# Run database migrations
npx medusa db:migrate

# Start development server (port 9000)
yarn dev
```

The backend will be available at `http://localhost:9000`.

## Available Scripts

| Script | Description |
|--------|-------------|
| `yarn dev` | Start development server with hot reload |
| `yarn build` | Build for production (backend only) |
| `yarn build:admin` | Build with admin panel (for Vercel) |
| `yarn start` | Run migrations and start production server |
| `yarn seed` | Seed database with initial data |
| `yarn sync-sheets` | Sync products from Google Sheets |
| `yarn test:integration:http` | Run HTTP integration tests |
| `yarn test:unit` | Run unit tests |

## Deployment

### Railway (Backend API)

The `Dockerfile` is configured for Railway deployment:

1. Connect Railway to the `baucis-zen` repository
2. Set the root directory to `backend`
3. Configure environment variables
4. Deploy

Railway will automatically:
- Build the Docker image
- Run database migrations
- Start the Medusa server on port 9000

### Vercel (Admin Panel)

The admin panel can be deployed separately to Vercel:

1. Connect Vercel to the `baucis-zen` repository
2. Set the root directory to `backend`
3. Set `DISABLE_ADMIN=false` in environment
4. Set `MEDUSA_BACKEND_URL` to your Railway backend URL
5. Deploy using `vercel.json` configuration

## API Endpoints

### Store API (`/store/*`)

- `/store/config` - Store configuration
- `/store/customers/*` - Customer management
- `/store/cart/*` - Cart operations
- `/store/orders/*` - Order management
- `/store/pok/*` - Payment processing
- `/store/shipping/calculate` - Shipping calculations
- `/store/exchange-rate` - Currency exchange rates
- `/store/verify-phone/*` - Phone verification
- `/store/zen-points/*` - Loyalty points

### Admin API (`/admin/*`)

- `/admin/custom` - Custom admin endpoints
- `/admin/sync-sheets` - Google Sheets sync

### Webhooks (`/webhooks/*`)

- `/webhooks/clerk` - Clerk authentication webhooks

## Testing

```bash
# Run HTTP integration tests
yarn test:integration:http

# Run module integration tests
yarn test:integration:modules

# Run unit tests
yarn test:unit
```

## Resources

- [Medusa Documentation](https://docs.medusajs.com)
- [Medusa v2 Migration Guide](https://docs.medusajs.com/resources/medusa-v2-migration)
- [API Reference](https://docs.medusajs.com/api)
