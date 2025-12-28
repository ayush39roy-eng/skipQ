# SkipQ Mobile (React Native + Expo)

This folder hosts the mobile app (Expo, TypeScript). It’s isolated from the web/Next.js project to avoid dependency clashes.

## Prereqs
- Node 18+
- Expo CLI (bundled via `npx`, no global install needed)
- Android Studio + SDK for Android emulator (Windows-friendly). iOS requires macOS/Xcode.

## Install
```powershell
cd mobile
npm install
```

## Run (development)
```powershell
# start Metro
npm start
# then choose: press 'a' for Android emulator, or scan QR with Expo Go on device
```

## Project structure
- `app/` uses Expo Router.
  - `home.tsx`: canteen list placeholder
  - `canteen.tsx`: menu placeholder
  - `orders.tsx`: orders placeholder
  - `login.tsx`: auth placeholder
- `app.json`: Expo config (name, icons, scheme)
- `tsconfig.json`: TypeScript settings (extends Expo base)
- `babel.config.js`: Expo + Expo Router

## Next steps (connect to backend)
- Add an API client (axios + React Query) with the backend base URL (`http://localhost:3000` or your tunnel) in a single config file, e.g. `src/api/client.ts`.
- Implement auth (NextAuth/Google) by adding real login endpoints and token storage (SecureStore/AsyncStorage).
- Replace mock screens with live data: canteens list, menu sections/items, cart, checkout, order status polling.
- Add push notifications (FCM): register device token and call a backend `register-device` endpoint.

## Notes
- Keep this folder separate from the web app dependencies.
- Commit with its own lockfile (`package-lock.json`).
- For production builds: `expo run:android` / `expo run:ios` (macOS required for iOS).
