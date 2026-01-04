# Baucis Zen Mobile App

React Native mobile app built with Expo and NativeWind (Tailwind CSS).

## Tech Stack

- **Expo SDK 54** - Managed workflow
- **React Native 0.81** - Cross-platform mobile
- **NativeWind 4** - Tailwind CSS for React Native
- **Expo Router 6** - File-based routing
- **Zustand** - State management
- **React Query** - Server state management
- **i18next** - Internationalization (8 languages)
- **Clerk** - Authentication
- **Mapbox** - Maps integration

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo Go app on your physical device (iOS/Android)
- Expo account (for tunnel mode)

## Setup

1. **Install dependencies:**

```bash
cd mobile
npm install
```

2. **Configure environment variables:**

Create a `.env` file in the mobile folder:

```bash
# Backend API
EXPO_PUBLIC_BACKEND_URL=https://your-backend.railway.app
EXPO_PUBLIC_STORE_ID=your-store-id

# Clerk Authentication
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx

# Mapbox
EXPO_PUBLIC_MAPBOX_TOKEN=pk.xxx
```

3. **Login to Expo (for tunnel mode):**

```bash
npx expo login
```

## Development

### Tunnel Mode (Recommended for physical devices)

Tunnel mode creates a public URL that allows your phone to connect to the dev server regardless of network configuration. This is the most reliable method for testing on physical devices.

```bash
npm run start:tunnel
```

Or directly:

```bash
npx expo start --tunnel
```

Then scan the QR code with:
- **iOS:** Camera app or Expo Go app
- **Android:** Expo Go app

### LAN Mode

If your phone is on the same network as your development machine:

```bash
npm run start:lan
```

### Local Mode

Default mode, requires same network and proper firewall settings:

```bash
npm start
```

## Project Structure

```
mobile/
├── app/                    # Expo Router screens (file-based routing)
│   ├── (auth)/            # Authentication screens
│   ├── (checkout)/        # Checkout flow
│   ├── (tabs)/            # Main tab navigation
│   ├── account/           # Account screens
│   ├── addresses/         # Address management
│   ├── game/              # Gamification features
│   ├── legal/             # Legal pages
│   ├── orders/            # Order history
│   ├── products/          # Product screens
│   ├── _layout.tsx        # Root layout
│   └── modal.tsx          # Modal screen
├── components/            # Reusable components
│   ├── address/          # Address components
│   ├── checkout/         # Checkout components
│   ├── game/             # Game components
│   ├── icons/            # Custom icons
│   ├── settings/         # Settings components
│   └── ui/               # UI primitives
├── assets/               # Images, fonts, icons
│   ├── fonts/
│   └── images/
├── constants/            # App constants
├── hooks/                # Custom React hooks
├── i18n/                 # i18n configuration
├── lib/                  # Utility libraries
│   └── api/             # API client
├── locales/              # Translation files
│   ├── en.json
│   ├── de.json
│   ├── fr.json
│   ├── it.json
│   ├── es.json
│   ├── tr.json
│   ├── el.json
│   └── sq.json
└── store/                # Zustand stores
```

## Building for Production

### Development Build (with Dev Client)

```bash
npm run build:dev
# or
eas build --profile development --platform all
```

### Preview Build (internal testing)

```bash
npm run build:preview
# or
eas build --profile preview --platform all
```

### Production Build (App Store/Play Store)

```bash
npm run build:prod
# or
eas build --profile production --platform all
```

## EAS Configuration

Before building, configure the EAS settings in `eas.json`:

1. **Get an EAS Project ID:**
   - Go to [expo.dev](https://expo.dev)
   - Create a new project
   - Copy the Project ID

2. **Update app.json:**
   ```json
   "extra": {
     "eas": {
       "projectId": "your-actual-project-id"
     }
   }
   ```

3. **For App Store submission (iOS):**
   Update `eas.json` with your Apple credentials:
   ```json
   "submit": {
     "production": {
       "ios": {
         "appleId": "your-apple-id@email.com",
         "ascAppId": "app-store-connect-app-id",
         "appleTeamId": "TEAM_ID"
       }
     }
   }
   ```

4. **For Play Store submission (Android):**
   - Create a service account in Google Play Console
   - Download the JSON key
   - Place it as `google-play-service-account.json` (gitignored)

## Troubleshooting

### Tunnel not starting

If you see `Tunnel not starting` errors:

1. Make sure you're logged in: `npx expo login`
2. Check your internet connection
3. Try clearing the cache: `npx expo start --tunnel --clear`

### Metro bundler issues

```bash
# Clear Metro cache
npx expo start --clear

# Reset npm cache and reinstall
rm -rf node_modules
npm cache clean --force
npm install
```

### iOS Simulator issues

```bash
# Install iOS dev tools
npx expo run:ios
```

### Android Emulator issues

```bash
# Make sure Android Studio and SDK are set up
npx expo run:android
```

## Supported Platforms

- iOS 13.4+
- Android API 21+ (Android 5.0+)
- Web (limited - use frontend/ for full web experience)

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm start` | Start Metro bundler |
| `npm run start:tunnel` | Start with tunnel (physical device testing) |
| `npm run start:lan` | Start with LAN mode |
| `npm run web` | Start web version |
| `npm run ios` | Run on iOS simulator |
| `npm run android` | Run on Android emulator |
| `npm run build:dev` | Build development client |
| `npm run build:preview` | Build preview (internal) |
| `npm run build:prod` | Build production |

## Related Documentation

- [Expo Documentation](https://docs.expo.dev)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [NativeWind](https://www.nativewind.dev)
- [Clerk Expo](https://clerk.com/docs/quickstarts/expo)
- [EAS Build](https://docs.expo.dev/build/introduction/)
