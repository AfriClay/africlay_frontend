# AfriClay Frontend

AfriClay frontend is the Expo + React Native client for the marketplace experience. It is designed to run on Android, iOS, and web while keeping the same business logic and UI structure across platforms.

This app is responsible for:

- authentication and onboarding screens
- seller discovery and storefront browsing
- product details and cart flows
- category and marketplace exploration
- responsive web behavior alongside mobile-native experience
- Django JWT bearer authentication on web and native

## Tech Stack

- Expo SDK 57
- React Native 0.86
- React 19
- TypeScript
- React Navigation
- React Query
- Expo Secure Store
- Native and web compatibility via React Native Web

## Project Structure

```text
front_end/
├── App.tsx                  # App bootstrap and root providers
├── app.json                 # Expo app configuration
├── index.ts                 # Expo entry point
├── package.json             # Scripts and dependencies
├── tsconfig.json            # TypeScript config
├── .env.example             # Frontend environment template
├── assets/                  # Static app assets
├── scripts/                 # Helper scripts
├── src/
│   ├── components/          # Shared UI and layout components
│   ├── contexts/            # Auth, cart, and app-level state
│   ├── hooks/               # Reusable app hooks
│   ├── lib/                 # Utility and helper code
│   ├── navigation/          # App navigation structure
│   ├── screens/             # Feature screens
│   ├── services/            # API and backend integration
│   ├── theme/               # Design tokens and theme setup
│   ├── types/               # Type definitions
│   └── utils/               # Shared helper functions
├── android/                 # Native Android project
├── ios/                     # Native iOS project
├── dist/                    # Build artifacts
├── README.md                # This file
├── AUTH_SETUP.md            # Auth and API flow notes
├── RESPONSIVE_LAYOUT.md     # Web/mobile layout strategy
└── node_modules/            # Installed dependencies
```

## Prerequisites

Before running the frontend, install:

- Node.js LTS
- npm
- Git
- Android Studio + Android SDK (for Android builds)
- JDK 17
- A working Django backend instance from `updated_backend/Africlay-server`

## Install Dependencies

From the frontend folder:

```powershell
cd front_end
npm install
Copy-Item .env.example .env
```

## Environment Configuration

Open `.env` and set the backend URL that matches your target environment:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

Use these values depending on your runtime:

- Web: `http://localhost:8000/api`
- Android emulator: `http://10.0.2.2:8000/api`
- Physical device: `http://<your-lan-ip>:8000/api`

Do not use Docker service names directly in the mobile client app.

## Start the App

### Web

```powershell
npm run web
```

This starts the Expo web app, usually at:

- `http://localhost:8081`
- or another assigned Expo port depending on availability

### Android Emulator / Device

```powershell
npm run android
```

This builds the native Android app and launches it on the connected emulator or device.

### Start Expo Dev Server

```powershell
npm start
```

## Useful Scripts

```powershell
# Start Expo development server
npm start

# Start web dev server
npm run web

# Start Android app
npm run android

# Type-check the project
npx tsc --noEmit

# Clear Metro cache
npx expo start --clear
```

## Authentication Flow

The frontend uses the Django backend for:

- login
- registration
- email verification OTP flow
- password reset flow
- JWT token persistence
- session handling and refresh logic

Login and email verification return a nested access/refresh token pair. The app
stores it with `expo-secure-store` on native and browser `localStorage` on web.
Authenticated requests use `Authorization: Bearer <access>`. On `401`, one
refresh rotates the pair and the request is retried once. Logout posts the
refresh token with the access bearer header and clears local tokens. The updated
backend has no `/auth/csrf/` endpoint and does not use cookie authentication.

Browser `localStorage` is JavaScript-accessible, **not HttpOnly**; an XSS bug can
expose stored tokens. Use HTTPS and a strict script/CSP policy for production.
See `AUTH_SETUP.md` for the contract and deployment tradeoffs.

## Catalog API (Phase 2B)

The updated Django backend serves public products, categories, tags, and
active stores under `/api/products/` and `/api/stores/`. Public product details
use `/api/products/<slug>/`; seller-owned reads and writes use UUIDs under
`/api/products/manage/`. Product creation and updates send Django's `name`,
`slug`, `sku`, `description`, `price`, `currency`, `stock_quantity`, `category`
(UUID or null), `tags` (UUIDs), and `status` fields. Images are uploaded
separately with multipart `POST /api/products/manage/<uuid>/images/` and must
be 5 MB or smaller. Backend image validation is via Django's ImageField; the
client picker accepts JPG, PNG, and WebP. New products are saved as drafts;
publishing requires approved KYC on the backend.

Public filters accept category and tag **slugs**. The backend has no search
parameter or store-product filter, so the UI searches the already loaded
unpaginated public list and filters that list by store UUID for store pages.
Do not treat that as server-wide search if pagination is enabled later. The
current backend returns arrays; the client also accepts a `results` wrapper,
but does not follow subsequent pages. No mock products or sellers are shown
when the API fails.

There is no product DELETE route, image DELETE route, or public store-detail
route by UUID. Seller management therefore supports list, create, edit, and
image upload, **not full CRUD**. The delete control is hidden. Store detail and
update use store slugs; UUIDs from products are resolved through the public
store list. The store list does not expose KYC approval, so an active store is
not presented as verified. Seller onboarding no longer seeds demo products,
but its storefront form is still local flow state and does not create a Django
store or change a buyer's backend role. A real seller account and store are
required for seller product mutations. Services, reviews, cart, and orders
remain separate integration phases.

### Phase 2B local verification (2026-09-20)

With the updated backend Docker containers running on port 8000, seed the
local database from `updated_backend/Africlay-server`:

```powershell
docker compose exec -T backend python manage.py seed_phase2b_catalog
```

The command refuses non-local or non-debug settings. It creates a namespaced,
verified seller with an unusable password, an active store with approved local
test KYC, two categories, two tags, two published products, and synthetic PNG
images. It is idempotent and does not change unrelated records. The generated
images prove rendering and upload behavior, not real catalog photography.

Start Expo web on port 8081, then run the local Edge browser check from
`front_end` (Playwright is installed outside the repository):

```powershell
npm install --prefix "$env:TEMP\africlay-phase2b-browser" --no-save --package-lock=false playwright
node scripts/test-phase2b-live-browser.cjs
```

The check generates a short-lived seller session through the local Django
container in memory; it does not print or save credentials. It creates one
namespaced browser draft and one UI draft on the first run, then reuses them.
Recorded result: 16/16 Edge checks passed for public listing, slug detail,
gallery/images, category/tag filters, store tabs/products, authenticated
wishlist, seller dashboard access, and seller create/edit/upload. Django
`manage.py check` and all 88 backend tests passed; 17 catalog and 15 auth
frontend checks, TypeScript, and web export passed.

The verification exposed and fixed a seller-navigation defect: a verified
backend seller was sent to local onboarding after session restore. The Sell tab
now checks the signed-in seller's active store and approved backend KYC before
showing the existing dashboard. Backend permissions still control mutations.
The unsupported delete, server-side search, store-product filter, and
store-creating onboarding limitations above remain open; this is not full
seller CRUD. No commerce integration was started.

## Responsive Layout Strategy

This project is intentionally built as a mobile-first app with web-aware layout adjustments. The app uses:

- route-aware container widths
- layout context for compact/expanded/wide behavior
- a shared marketplace shell instead of forcing a single desktop redesign

Please review:

- `src/components/layout/MarketplaceShell.tsx`
- `src/contexts/ResponsiveLayoutContext.tsx`
- `RESPONSIVE_LAYOUT.md`

## Project Notes

- The frontend remains aligned with the backend contract and should not replace Django auth flows.
- Do not introduce alternate auth providers unless explicitly required.
- Keep the app architecture stable while improving behavior and responsiveness.
- Prefer minimal, targeted fixes over redesigns when stabilizing features.

## Troubleshooting

### App cannot reach backend

Check:

- `.env` is present and correct
- backend is running on the expected port
- the target device and computer are on the same network if using LAN IP

### Web runtime crashes

Common causes include:

- using native-only storage APIs in browser context
- using native navigation assumptions on web
- assuming secure-store is available in all environments

### Metro or Expo issues

Run a clean cache:

```powershell
npx expo start --clear
```

### TypeScript errors

```powershell
npx tsc --noEmit
```

## Development Recommendation

Use this flow during active development:

1. Start the Django backend
2. Confirm the API is reachable from the chosen device
3. Start the Expo app in the correct mode
4. Validate web and native flows separately
5. Keep API contract fixes centered on the backend and UI stability fixes centered on the frontend

## License

Specify the project license here if applicable.
- Automatic access-token refresh on `401`
- Logout with refresh-token revocation

Keep the backend Dockerized and separate from this Expo app. Configure the frontend with `EXPO_PUBLIC_API_URL`, including the `/api` suffix.

## How the app works

### Startup and authentication state

`App.tsx` loads the Inter fonts, keeps the splash screen visible until fonts are ready, and mounts the application providers. `RootNavigator` waits for auth initialization, shows the splash screen for a short minimum duration, and then chooses the navigation tree:

- Signed out: `AuthStack`
- Guest: `AppTabs` plus modal access to `AuthStack`
- Signed-in member: `AppTabs`, cart, checkout, and notifications

The auth flow can include registration, email verification, role selection, profile completion, seller KYC, pending verification, and storefront setup. A Django user response is mapped into the app's `User` type by `src/services/authService.ts`.

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
2. React Query client
3. `AuthProvider`
4. `CartProvider`
5. `WishlistProvider`

Auth state comes from the Django JWT API and is also used to track onboarding and seller verification state. Cart and wishlist state are exposed through their React contexts. React Query is available for screen-level server-style data fetching and caching.

Most marketplace data is local development data. Services such as `productService`, `orderService`, `reviewService`, `messageService`, and `notificationService` read from `src/mock/` and use `simulateNetwork()` to imitate network latency and occasional failures. This means the app can be explored without a backend, but changes are not a replacement for a production API.

Some local data is persisted with AsyncStorage, including seller-created catalog entries and relevant app state. JWT tokens use `expo-secure-store` on native and `localStorage` on web. Clearing app storage removes local development state.

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
- Seller role and onboarding values are frontend flow state until the matching backend seller profile endpoints are wired. Production authorization must be enforced by the backend.
- There are no test or lint scripts currently defined in `package.json`. Use the TypeScript compiler or the platform build as an additional local check when changing code.
