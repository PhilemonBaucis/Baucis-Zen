# Project Plan: Baucis Zen

## Overview
Consolidate the existing baucis-frontend, baucis-backend, and baucis-mobile repositories into a single monorepo called "Baucis Zen". The frontend and backend code will be copied as-is (already working). The mobile app uses Expo and will be set up for tunnel-based development testing on physical devices. User will manually configure Railway/Vercel deployments after setup.

## Tech Stack
- **Frontend**: Next.js 14+ (App Router) with Tailwind CSS, i18n
- **Backend**: Medusa.js e-commerce platform (TypeScript)
- **Mobile**: Expo/React Native with NativeWind (Tailwind), file-based routing
- **Database**: Already configured via Medusa (Neon PostgreSQL)
- **Deployment**: Vercel (frontend), Railway (backend), Expo tunnel (mobile dev)

## Architecture

```
baucis-zen/                    # Monorepo root
├── frontend/                  # Next.js web app (from baucis-frontend)
│   ├── app/
│   ├── components/
│   ├── i18n/
│   ├── lib/
│   ├── messages/
│   └── public/
├── backend/                   # Medusa.js backend (from baucis-backend)
│   ├── src/
│   │   ├── admin/
│   │   ├── api/
│   │   ├── modules/
│   │   └── workflows/
│   └── Dockerfile
├── mobile/                    # Expo React Native app (from baucis-mobile)
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (checkout)/
│   │   ├── (tabs)/
│   │   ├── account/
│   │   ├── orders/
│   │   └── products/
│   ├── components/
│   ├── assets/
│   └── locales/
└── .orchestra/                # Orchestration files
```

## Tasks per Agent

### Backend Agent
- [ ] Clone baucis-backend repository content into backend/ folder
- [ ] Verify all files are correctly copied (Dockerfile, medusa-config.ts, src/, etc.)
- [ ] Update any relative paths if needed
- [ ] Ensure .gitignore is properly configured for the subfolder
- [ ] Create README.md with setup instructions for the backend

### Frontend Agent
- [ ] Clone baucis-frontend repository content into frontend/ folder
- [ ] Verify all files are correctly copied (app/, components/, i18n/, etc.)
- [ ] Update any relative paths if needed
- [ ] Ensure .gitignore is properly configured for the subfolder
- [ ] Create README.md with setup instructions for the frontend

### Mobile Agent
- [ ] Clone baucis-mobile repository content into mobile/ folder
- [ ] Verify all files are correctly copied (app/, components/, assets/, etc.)
- [ ] Configure Expo for tunnel development
- [ ] Verify app.json and eas.json are correctly set up
- [ ] Ensure .gitignore is properly configured for the subfolder
- [ ] Create README.md with Expo tunnel development instructions
- [ ] Test that `npx expo start --tunnel` works correctly

## GitHub Repository Setup

Create a single new repository:
- **Repository**: `PhilemonBaucis/baucis-zen`
- **Visibility**: Private
- **Structure**: Monorepo with frontend/, backend/, mobile/ subfolders

## Development Workflow

### Mobile Testing (Expo Tunnel)
```bash
cd mobile
npm install
npx expo start --tunnel
# Scan QR code with Expo Go app on phone
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Backend Development
```bash
cd backend
npm install
npm run dev
```

## Completion Criteria
1. All three existing repos are merged into baucis-zen monorepo structure
2. New GitHub repo `baucis-zen` is created and code is pushed
3. Each subfolder (frontend, backend, mobile) works independently
4. Mobile app can be tested via Expo tunnel on physical device
5. README files document setup for each component
6. User can manually connect Railway/Vercel to the new repo

### Required Agents
- frontend: Copy baucis-frontend code and set up the frontend subfolder
- backend: Copy baucis-backend code and set up the backend subfolder
- mobile: Copy baucis-mobile code, configure Expo tunnel for development testing
