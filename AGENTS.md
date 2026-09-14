# AfriClay Agent Guide

## Project

- This is an Expo React Native marketplace app targeting Expo SDK 57, React Native 0.86, and React 19.
- Read [README.md](README.md) for setup, provider order, navigation, mock-data behavior, and the project layout.
- Read [AUTH_SETUP.md](AUTH_SETUP.md) before changing Clerk, OAuth, redirect schemes, or release configuration.

## Commands

Run from the repository root:

```powershell
npm install
Copy-Item .env.example .env
npm start
npm run android
npm run web
npx tsc --noEmit
```

- `npm run ios` requires macOS and Xcode.
- Use `npx expo start --clear` after changing `.env` or when Metro cache is stale.
- There are currently no test or lint scripts. Use the TypeScript check and the relevant Expo platform build as validation.

## Architecture

- `App.tsx` owns fonts, splash handling, Clerk, React Query, and the root context providers.
- `src/navigation/` owns auth routing, tabs, and feature stacks; `src/screens/` owns screen-level orchestration.
- `src/components/ui/` contains reusable controls and states; `src/components/domain/` contains marketplace presentation components.
- `src/contexts/` owns cross-screen auth, cart, wishlist, and side-menu state.
- `src/services/` is the data-access boundary. Most services currently read `src/mock/` data and simulate network latency/failures.
- `src/types/` contains shared domain contracts, `src/validation/` contains Zod schemas, and `src/theme/` contains shared design tokens.

## Conventions

- Keep TypeScript strict and preserve typed React Navigation param lists.
- Prefer named exports, typed components, semicolons, single quotes, and trailing commas, matching nearby code.
- Use `StyleSheet.create`, shared theme tokens, and `lucide-react-native`; do not introduce isolated colors or spacing values without a clear reason.
- Use React Query for screen-level service data and invalidate the matching query keys after mutations.
- Use React Hook Form with `zodResolver` for forms and expose accessibility labels/roles on reusable controls.
- Follow nearby patterns before adding abstractions; keep screen orchestration out of reusable UI components.

## Auth And Data Safety

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is required. Never put Clerk secret keys, Google client secrets, or other private credentials in the app or an `EXPO_PUBLIC_` variable.
- The native callback scheme is `africlay://auth/callback`; native configuration changes require a rebuild.
- Clerk role and onboarding values currently use client-editable `unsafeMetadata`; never treat them as backend authorization.
- Guest state is distinct from signed-out state. Do not infer guest access only from `user` being undefined.
- Product and order mutations may persist to AsyncStorage, while general orders and messages are in-memory. Do not assume mock data behaves like a durable backend.
- Product image-picker URIs are local device paths and are not uploaded by the current implementation.

## Validation

- For UI or navigation changes, run `npx tsc --noEmit` and the relevant Expo target when available.
- For auth changes, verify the flow against [AUTH_SETUP.md](AUTH_SETUP.md), including email codes, Google cancellation, session restoration, and logout.
- Keep changes scoped to the owning layer and avoid unrelated native or generated build output.