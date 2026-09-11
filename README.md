# AfriClay

AfriClay is an Expo React Native marketplace app for discovering African products and services, messaging sellers, managing a cart, placing orders, and setting up a seller storefront.

## Requirements

This guide assumes Windows and Android development. The project currently targets Expo SDK 57, React Native 0.86, React 19, Android API 36, and Java/Kotlin native modules.

Install these tools before running the app:

1. **Node.js LTS**, which includes npm. Verify it in PowerShell:

	```powershell
	node --version
	npm.cmd --version
	```

2. **Git**, if you are cloning the repository.

3. **Android Studio**, including:
	- Android SDK Platform 36
	- Android SDK Build-Tools 36.0.0
	- Android SDK Platform-Tools
	- Android SDK Command-line Tools
	- Android Emulator
	- An Android SDK location such as `C:\Users\<username>\AppData\Local\Android\Sdk`

4. **JDK 17**. Android Studio's bundled JDK is normally suitable. In Android Studio, check `File > Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK` and select the embedded JDK or another JDK 17 installation.

5. A **Clerk account and publishable key**. The app cannot complete authentication without `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`. See [AUTH_SETUP.md](AUTH_SETUP.md) for the Clerk dashboard configuration.

The Android SDK tools must be available to PowerShell. Add these Windows environment variables if they are not already configured:

```text
ANDROID_HOME=C:\Users\<username>\AppData\Local\Android\Sdk
ANDROID_SDK_ROOT=C:\Users\<username>\AppData\Local\Android\Sdk
```

Add these folders to `Path`:

```text
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
%ANDROID_HOME%\cmdline-tools\latest\bin
```

Close and reopen PowerShell after changing environment variables. Verify Android debugging tools are available:

```powershell
adb version
```

## First-time setup

Run all commands from the repository root, the folder containing `package.json` and `App.tsx`.

If Android Studio installed the SDK in a different folder, update `android/local.properties` so its `sdk.dir` points to that SDK. For example:

```properties
sdk.dir=C:\\Users\\<username>\\AppData\\Local\\Android\\Sdk
```

Install JavaScript dependencies and create the local environment file:

```powershell
npm.cmd install
Copy-Item .env.example .env
```

Open `.env` and replace the placeholder with the Clerk **publishable** key:

```dotenv
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

Do not put a Clerk secret key, Google client secret, or other private credential in `.env` variables exposed to the app. Never commit `.env`.

After changing `.env`, stop any running Expo process and clear the Metro cache:

```powershell
npx.cmd expo start --clear
```

The first native Android build downloads Gradle and Android dependencies and can take several minutes.

## Run on Android

`npm.cmd run android` builds the native development app, installs it on the first available emulator or device, and starts the JavaScript bundler. Keep the Android target running and connected before using that command.

```powershell
npm.cmd run android
```

If PowerShell reports that `npm` scripts are disabled, use `npm.cmd` and `npx.cmd` as shown above. This is a Windows PowerShell policy issue, not an application error.

### Option 1: Android Studio emulator

1. Open Android Studio.
2. Open **More Actions > Virtual Device Manager** or **Tools > Device Manager**.
3. Select **Create device** and choose a phone, such as a Pixel device.
4. Download and select an x86_64 or arm64 system image. Android API 35 or 36 is appropriate.
5. Finish creating the virtual device and press its play button.
6. Confirm that Android sees it:

	```powershell
	adb devices
	```

	The emulator should appear with a status of `device`.

7. From the repository root, run:

	```powershell
	npm.cmd run android
	```

The emulator can use the computer's `localhost` for Metro. If the app opens but cannot load JavaScript, close the app, run `npx.cmd expo start --clear`, and press `r` in the Expo terminal to reload.

### Option 2: Physical device over USB

1. On the Android phone, open **Settings > About phone**.
2. Tap **Build number** seven times to enable Developer options.
3. Open **Developer options** and enable **USB debugging**.
4. Connect the phone with a USB cable that supports data transfer.
5. Accept the **Allow USB debugging** prompt on the phone. If the prompt does not appear, unlock the phone and reconnect the cable.
6. Confirm the connection:

	```powershell
	adb devices
	```

	The phone should appear with a status of `device`, not `unauthorized`.

7. Run the native app:

	```powershell
	npm.cmd run android
	```

If the device is `unauthorized`, revoke USB debugging authorizations in Developer options, reconnect the cable, and accept the prompt again. If no device appears, try another USB cable or install the phone manufacturer's Windows USB driver.

### Option 3: Physical device over Wi-Fi

The computer and phone must be connected to the same Wi-Fi network. Avoid guest networks that isolate devices.

#### Android 11 and newer: wireless pairing

1. On the phone, enable **Developer options** and **Wireless debugging**.
2. Open **Wireless debugging > Pair device with pairing code** and leave that screen visible.
3. In PowerShell, use the IP address and pairing port displayed on the phone:

	```powershell
	adb pair PHONE_IP:PAIRING_PORT
	```

4. Enter the six-digit pairing code shown on the phone.
5. Connect using the address and connection port shown on the main Wireless debugging screen:

	```powershell
	adb connect PHONE_IP:CONNECTION_PORT
	adb devices
	```

6. When the device status is `device`, run:

	```powershell
	npm.cmd run android
	```

The pairing port and connection port are usually different. Use the values shown by Android rather than assuming port `5555`.

#### Older Android versions: USB-assisted Wi-Fi debugging

Connect the phone by USB first, then run:

```powershell
adb devices
adb tcpip 5555
adb connect PHONE_IP:5555
adb disconnect USB_DEVICE_ID
adb devices
```

Replace `PHONE_IP` with the phone's Wi-Fi address. Once `adb devices` shows the phone over Wi-Fi, run `npm.cmd run android`. This method may stop working after the phone restarts; repeat it when necessary.

For Metro, keep the phone and computer on the same network. If the app cannot reach the bundler, start Expo in LAN mode and reload the app:

```powershell
npx.cmd expo start --dev-client --lan
```

If the network blocks LAN traffic, use USB debugging instead or configure the Expo development server through the developer menu using the computer's IP address.

## Useful commands

```powershell
# Start Expo without building the native app
npm.cmd start

# Start with a clean Metro cache and a development client
npx.cmd expo start --dev-client --clear

# Check connected Android targets
adb devices

# Run the web target
npm.cmd run web

# Type-check the project
npx.cmd tsc --noEmit

# Rebuild after native configuration or dependency changes
npx.cmd expo prebuild
npm.cmd run android
```

The app uses a native development build, so Expo Go is not the expected target for the full Android experience. Use the emulator or device workflows above.

## Troubleshooting Android

### `NoClassDefFoundError` for an Expo class

This means the installed native APK was built from inconsistent Expo package versions or is stale. Reinstall dependencies, clean the native build, and rebuild:

```powershell
npm.cmd install
Push-Location android
.\gradlew.bat clean
Pop-Location
npm.cmd run android
```

The Expo packages in this project must stay on SDK 57-compatible versions. In particular, `expo-splash-screen` must not be replaced with an SDK 55 version.

### `adb` is not recognized

Add the Android SDK `platform-tools` folder to the Windows `Path`, reopen PowerShell, and retry `adb version`.

### The app opens but shows a network or bundle error

Make sure the device and computer can reach each other, then restart Metro with a clean cache:

```powershell
npx.cmd expo start --dev-client --clear
```

For a physical device, use USB debugging or confirm both devices are on the same non-isolated Wi-Fi network.

### The app says Clerk is not configured

Check that `.env` contains a real `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, not the placeholder, then fully restart Expo with `npx.cmd expo start --clear`. The key must be a Clerk publishable key beginning with `pk_test_` or `pk_live_`.

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
