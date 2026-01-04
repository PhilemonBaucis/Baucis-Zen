# Mobile Agent Tasks

## Tasks
- [x] Clone baucis-mobile repository content into mobile/ folder
- [x] Verify all files are correctly copied (app/, components/, assets/, etc.)
- [x] Configure Expo for tunnel development
- [x] Verify app.json and eas.json are correctly set up
- [x] Ensure .gitignore is properly configured for the subfolder
- [x] Create README.md with Expo tunnel development instructions
- [x] Test that `npx expo start --tunnel` works correctly

## New Tasks
- [x] Fix NativeWind/react-native-css-interop Metro error: "Cannot read properties of undefined (reading 'call')"
- [x] Update react-native-svg to version 15.12.1 and react-native-webview to 13.15.0 for Expo SDK compatibility
- [x] Ensure Expo tunnel starts without errors and displays the QR code/URL for Expo Go
- [x] Environment variables are configured in mobile/.env (synced from frontend/.env.local):
      - EXPO_PUBLIC_BACKEND_URL=https://baucis-backend-production.up.railway.app
      - EXPO_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_4095224a4e5995154c896d8e4a30267f68286bd465a44cf0809daf79f3d3aaf9
      - EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZmFtb3VzLW94LTQ2LmNsZXJrLmFjY291bnRzLmRldiQ
      - EXPO_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoiYmF1Y2lzemVuIiwiYSI6ImNtajV6cWhycTF0eDYzZXNmajBqZG4xZjkifQ.aG-Gr1D0XOeF0CwqRUk2ug
