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
keyboard focus, and session restoration after reloading. HttpOnly cookie
sessions require the same API hostname before and after reloading.

## Auth Transport

Native clients receive the existing JSON token pair and store it using
`expo-secure-store`. Web clients use `credentials: include` and
`X-Auth-Transport: cookie`. Django also detects browser Origin/Fetch Metadata,
so a browser cannot request JSON tokens by changing that header.

Web login and OTP verification set host-only HttpOnly cookies on `/api/`.
Refresh rotates cookies without returning JWTs in JSON. Browser JavaScript
never reads or stores these JWTs. `/auth/csrf/` returns a CSRF token (not a JWT)
for `X-CSRFToken` on every unsafe browser request, including login and logout.
CSRF protection uses Django's middleware; CORS uses `django-cors-headers`.
Access tokens last five minutes; refresh tokens last seven days and are
single-use through the existing revocation table. No schema changes are needed.

Startup calls `/auth/me/` on web even though JavaScript cannot read cookies.
Concurrent refreshes within a client share one request; browsers supporting
Web Locks also serialize refresh across tabs. Logout must reach the backend
to clear HttpOnly cookies; a network failure is reported rather than claiming
the browser session was revoked.

## Production Configuration

Deploy the app and API on HTTPS within the same site, for example
`https://app.example.com` and `https://api.example.com`, or proxy `/api/`
through the app's origin. SameSite=Lax intentionally does not support
unrelated-site app/API hosting. Do not mix `localhost` and `127.0.0.1` in web
development. Local HTTP cookies are allowed only with `DEBUG=True`.

Set these backend environment variables on the deployment:

```dotenv
DEBUG=False
ALLOWED_HOSTS=api.example.com
WEB_ORIGINS=https://app.example.com
```

Supply a randomly generated SECRET_KEY of at least 50 characters through the
server's secret manager. Production enables Secure cookies, HTTPS redirects,
and HSTS. `WEB_ORIGINS` is an exact allowlist used for CORS and CSRF; do not
use wildcards. Set `TRUST_PROXY_HTTPS=true` only behind a trusted reverse proxy
that strips client-supplied X-Forwarded-Proto and sets it itself. Use a
production Django application server rather than the development Compose
runserver command. Configure real email delivery and edge rate limits before
public deployment. Existing day-long access tokens issued before this change
retain their original expiry; new access tokens last five minutes.

Set frontend `EXPO_PUBLIC_API_URL=https://api.example.com/api` before building.
This is public configuration; never place signing keys or SMTP credentials
in frontend environment variables. Rebuild the backend image to install the
new locked CORS dependency. Keep the database volume intact.

Validation commands:

```powershell
# From back_end/Africlay-server
docker compose exec -T backend python manage.py test authapp --noinput
docker compose exec -T backend python manage.py makemigrations --check --dry-run
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

Keep the Django backend in Docker. From `back_end/Africlay-server`, run:

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
- Logout calls the backend with the refresh token and clears secure storage.
