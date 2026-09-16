# AfriClay Frontend

AfriClay is an Expo and React Native marketplace client for Android, iOS, and web.

## Features

- Authentication, email verification, password reset, and onboarding
- JWT authentication on native platforms
- Cookie and CSRF-aware authentication on web
- Product discovery, seller stores, cart, checkout, and order history
- Responsive web and mobile layouts
- Django API integration with loading, error, and empty states

## Stack

- Expo SDK 57
- React Native 0.86
- React 19
- TypeScript
- React Navigation
- TanStack React Query
- Expo Secure Store

## Prerequisites

- Node.js LTS and npm
- Android Studio and an Android emulator, or a physical Android device
- JDK 17 for native Android builds
- A running Django backend from `back_end/Africlay-server`

## Install

```powershell
npm install
Copy-Item .env.example .env
```

Configure the backend URL in `.env`:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Runtime URL examples:

- Web: `http://localhost:8000/api`
- Android emulator: `http://10.0.2.2:8000/api`
- Physical device: `http://<computer-lan-ip>:8000/api`

## Run

```powershell
npm start
npm run web
npm run android
npm run ios
```

After changing environment variables, restart Expo and clear its cache:

```powershell
npx expo start --clear
```

## Validate

```powershell
npx tsc --noEmit
npx expo export --platform web
node scripts/test-auth-transport.cjs
```

## Backend integration

The frontend consumes the Django routes under `/api/auth/`, `/api/products/`,
`/api/stores/`, and `/api/cart/`. API access is centralized in
`src/services/api.ts`; feature services are in `src/services/`.

The backend currently does not expose categories, services, product images,
reviews, seller order management, or product deletion. The frontend represents
those unavailable capabilities with explicit empty states or errors instead of
inventing API responses.

## Project structure

```text
App.tsx
src/
  components/
  contexts/
  navigation/
  screens/
  services/
  theme/
  types/
  validation/
```
