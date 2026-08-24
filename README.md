# AfriClay

AfriClay is an Expo React Native marketplace app for discovering African products and services, messaging sellers, managing a cart, placing orders, and setting up a seller storefront.

## Requirements

- Node.js and npm
- Android Studio and an Android emulator, or a physical Android device
- Expo CLI through the local Expo dependency
- A Clerk account and publishable key for authentication

The project currently targets Expo SDK 57, React Native 0.86, and React 19.

## Run the app

From the repository root:

```powershell
npm install
Copy-Item .env.example .env
```

Open `.env` and replace the placeholder value with the Clerk publishable key:

```dotenv
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

Start the Expo development server:

```powershell
npm start
```

Then use the Expo terminal or developer menu to open the app. The available npm scripts are:

```powershell
npm run android  # Build and run the native Android app
npm run web      # Run the Expo web target
npm run ios      # Build and run iOS; requires macOS and Xcode
```

For a native Android development build, make sure an emulator is running or a device is connected, then run:

```powershell
npm run android
```

After changing `.env`, fully restart Expo and clear its cache:

```powershell
npx expo start --clear
```

If the app shows **Clerk is not configured**, the key is missing, still has the placeholder value, or Expo was not restarted after the environment change.

## Authentication setup

The app uses Clerk for:

- Email/password registration and login
- Six-digit email verification
- Password reset codes
- Google sign-in through Expo's browser-based OAuth flow
- Secure native session persistence
- Client Trust email challenges on new devices

Complete the Clerk dashboard configuration and OAuth redirect setup described in [AUTH_SETUP.md](AUTH_SETUP.md). The native callback scheme is `africlay://auth/callback`.

Never put a Clerk secret key or a Google client secret in the app or in an `EXPO_PUBLIC_` variable.

## How the app works

### Startup and authentication state

`App.tsx` loads the Inter fonts, keeps the splash screen visible until fonts are ready, and mounts the application providers. `RootNavigator` waits for Clerk and auth initialization, shows the splash screen for a short minimum duration, and then chooses the navigation tree:

- Signed out: `AuthStack`
- Guest: `AppTabs` plus modal access to `AuthStack`
- Signed-in member: `AppTabs`, cart, checkout, and notifications

The auth flow can include registration, email verification, role selection, profile completion, seller KYC, pending verification, and storefront setup. A completed Clerk session is mapped into the app's `User` type by `src/services/authService.ts`.

### Main navigation

Authenticated and guest users enter five bottom tabs:

- **Home**: marketplace discovery and featured content
- **Search**: product, service, category, and seller search
- **Sell**: seller onboarding and seller dashboard flows
- **Messages**: conversations with sellers and buyers
- **Profile**: account, orders, wishlist, and profile settings

The cart, checkout, and notifications screens are root-level modal routes. The side menu is mounted alongside the tabs through `SideMenuProvider`.

### State and data

The root provider order is:

1. `SafeAreaProvider`
2. Clerk provider
3. React Query client
4. `AuthProvider`
5. `CartProvider`
6. `WishlistProvider`

Auth state comes from Clerk and is also used to track onboarding and seller verification state. Cart and wishlist state are exposed through their React contexts. React Query is available for screen-level server-style data fetching and caching.

Most marketplace data is local development data. Services such as `productService`, `orderService`, `reviewService`, `messageService`, and `notificationService` read from `src/mock/` and use `simulateNetwork()` to imitate network latency and occasional failures. This means the app can be explored without a backend, but changes are not a replacement for a production API.

Some local data is persisted with AsyncStorage, including seller-created catalog entries and relevant app state. Clerk stores its native session using the Clerk token cache. Clearing app storage or reinstalling the app removes local development state.

## Project layout

```text
App.tsx                 Application providers and root entry point
src/navigation/         Auth, tabs, and feature stack navigators
src/screens/             Screen-level UI grouped by feature
src/components/          Shared and domain-specific components
src/contexts/             Auth, cart, wishlist, side-menu state
src/services/             Auth and mock service APIs
src/mock/                 Seed products, sellers, orders, messages, and reviews
src/theme/                Colors, typography, spacing, radii, and shadows
src/types/                Shared TypeScript domain types
src/validation/           Zod schemas for auth and checkout forms
assets/                   App icon, splash, and other static assets
```

## Development notes

- The app is configured as a light, portrait-oriented Expo app named `AfriClay`.
- Native configuration uses the `africlay` URL scheme, so changes to native app configuration require a native rebuild.
- Seller role and onboarding values currently live in Clerk `unsafeMetadata`. Treat them as client-editable data; production authorization must be enforced by a backend using server-controlled metadata.
- There are no test or lint scripts currently defined in `package.json`. Use the TypeScript compiler or the platform build as an additional local check when changing code.
