# AfriClay Django JWT authentication setup

AfriClay uses the Django REST API under `/api/auth/` for email/password accounts, six-digit email verification, password reset codes, JWT session persistence, token refresh, and logout.

## Web Compatibility And Layout

React Navigation native-stack 7 resolves its web-safe view in browsers and
its native view on Android/iOS. Keep its major version aligned with the other
React Navigation packages; native-stack 5 has no web support.

`AppFrame.web.tsx` owns browser layout: width follows the window up to 600px,
centered on larger displays, with desktop gutters using existing spacing
tokens. Short windows scroll vertically around a minimum 720px app surface
so centered forms remain reachable. Native uses `AppFrame.tsx`, retaining
the original flex layout. Existing cards, colors, type, navigation, and auth
screens are shared; there is no desktop theme.

For a manual browser smoke test, check 360px, 768px, and 1440px widths plus a
short landscape window. Check login, registration, guest tabs, the menu,
keyboard focus, and session restoration after reloading.

## Auth Transport

Login and email verification return `{ user, tokens: { access, refresh } }`.
Refresh accepts `{ refresh }` and returns a top-level `{ access, refresh }`.
Both web and native send `Authorization: Bearer <access>` on authenticated
requests. Native stores the pair in `expo-secure-store`. Web stores the pair in
browser `localStorage` so the session survives reloads; it does not use cookies,
`/auth/csrf/`, or `X-Auth-Transport`.

Browser `localStorage` is readable by JavaScript and is **not HttpOnly**. An
XSS vulnerability can expose these tokens. Use strict content security policy,
avoid untrusted scripts, and review this tradeoff before public deployment.
The API must use HTTPS outside local development. Never put signing keys or
service credentials in frontend code or `EXPO_PUBLIC_` variables.

On startup, saved tokens are used for `/auth/me/`. A `401` triggers one
deduplicated refresh and one retry; a failed refresh clears both tokens and
signs the client out. This deduplication is per running app instance, not
across browser tabs. Logout first confirms or refreshes the access token, then
posts `{ refresh }` with the bearer header and clears local tokens even if the
server reports an invalid session. A network failure cannot confirm server-side
revocation.

The updated backend currently hardcodes access lifetime to one day and refresh
lifetime to seven days in `authapp/utils.py`. It does not read the documented
`JWT_ACCESS_SECONDS` or `JWT_REFRESH_SECONDS` values yet. Refresh tokens are
single-use through the existing blacklist.

## Production Configuration

Set `EXPO_PUBLIC_API_URL=https://api.example.com/api` before building for
production. Configure the backend's allowed hosts and exact CORS origins for
the deployed frontend. Do not use wildcard CORS origins. Serve both app and API
over HTTPS, configure real email delivery and edge rate limits, and use a
production Django server instead of the development Compose runserver command.

Validation commands:

```powershell
# From updated_backend/Africlay-server
docker compose exec -T backend python manage.py check
docker compose exec -T backend python manage.py test --noinput
# From front_end
node --test scripts/test-auth-transport.cjs
npx tsc --noEmit
npx expo export --platform web
```

## Environment

Expo reads public app variables with the `EXPO_PUBLIC_` prefix. Set `EXPO_PUBLIC_API_URL` to the API root, including `/api`.

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

Use the host that is reachable from the device running the app:

- Web browser: `http://localhost:8000/api`
- Android emulator: `http://10.0.2.2:8000/api`
- Physical device: `http://<computer-lan-ip>:8000/api`

For an Android phone connected over USB, keep `http://localhost:8000/api`
and forward the API port from the phone to this computer:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:8000 tcp:8000
```

Repeat this after reconnecting or restarting the device. Alternatively,
restore it from `front_end` with `npm run android:connect`. This command
checks the local Django endpoint and restores port 8000 for connected devices.
USB forwarding is temporary; it is not an always-on backend connection.

Without forwarding,
`localhost` refers to the phone, not the computer. For Wi-Fi access, use the
computer's LAN IP, add that IP to Django's `ALLOWED_HOSTS`, and allow port 8000
through the local firewall. Restart Expo with `npx expo start --clear` after
changing `EXPO_PUBLIC_API_URL`.

Do not use Docker service names such as `http://backend:8000` in the mobile app. Those names only work inside Docker networking.

## Backend

Keep the Django backend in Docker. From `updated_backend/Africlay-server`, run:

```powershell
docker compose up -d --build backend
docker compose exec backend python manage.py migrate
```

The API must be published on port 8000. Containers serving ports 3000 or 3001
do not provide this Django API. The default console email backend writes OTP
emails to `docker compose logs backend`; it does not deliver email to inboxes.

The frontend expects these endpoints:

- `POST /api/auth/register/`
- `POST /api/auth/verify-email/`
- `POST /api/auth/resend-otp/`
- `POST /api/auth/login/`
- `POST /api/auth/token/refresh/`
- `POST /api/auth/logout/`
- `POST /api/auth/password-reset/`
- `POST /api/auth/password-reset/confirm/`
- `GET /api/auth/me/`
- `PATCH /api/auth/me/`

## Release Checks

- Register sends `first_name`, `last_name`, `password`, and `password_confirm`.
- Email verification stores the returned access and refresh tokens.
- Login stores the returned access and refresh tokens.
- Authenticated requests send `Authorization: Bearer <access_token>`.
- A `401` response refreshes the token pair and retries the original request once.
- A failed refresh clears tokens and returns the app to signed-out state.
- App startup restores saved sessions through `GET /api/auth/me/`.
- Logout sends bearer access plus the refresh token and clears platform token storage.
