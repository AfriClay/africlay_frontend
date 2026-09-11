# AfriClay Clerk authentication setup

AfriClay now uses Clerk for email/password accounts, six-digit email verification, secure native session persistence, Google OAuth, Client Trust email challenges, and password reset codes. The supplied Clerk development publishable key is already stored in the ignored local `.env` file.

## 1. Configure email/password and verification

In the Clerk Dashboard for the application that owns the publishable key:

1. Open **User & authentication > Email, phone, username**.
2. Enable **Email address** and require it for sign-up.
3. Enable **Password** as a sign-in method.
4. Require email verification at sign-up and enable the **Email verification code** strategy. The app expects the six-digit code strategy, not an email-link-only flow.
5. Keep first and last name optional. AfriClay stores the single full-name field in Clerk user metadata.
6. Review **Customization > Emails** and customize the verification and password-reset templates with the AfriClay name and support details.

Clerk sends the real verification and reset emails. The development instance is suitable for testing, but Clerk caps development-instance delivery at 100 emails per calendar month. Production email is sent from your configured domain, so complete Clerk's domain/DNS setup before public release.

The current development instance already exposes email/password, email-code verification, Google, and bot protection as enabled. The registration screen includes Clerk's CAPTCHA mount point for web; Clerk skips the browser CAPTCHA widget on native Android and iOS.

## 2. Enable Google login

1. Open **User & authentication > SSO connections** in Clerk.
2. Add or enable the **Google** social connection.
3. For development, use Clerk's development connection if the Dashboard offers it. For production, choose custom Google credentials and create a Google OAuth **Web application** client.
4. When using custom credentials, copy the Google Client ID and Client Secret into Clerk only. Never place the Google client secret in this app or an `EXPO_PUBLIC_` variable.
5. In Clerk's native/mobile redirect allowlist, add:

   ```text
   africlay://auth/callback
   ```

6. In Google Cloud, use the authorized redirect URI shown by Clerk for the Google connection. Copy it exactly; it is a Clerk HTTPS callback, not the `africlay://` app link.
7. If the Google consent screen is still in testing, add each tester's Google account under **Test users**.

The implementation uses Clerk's browser-based Expo SSO flow. It does not require native Android or iOS Google SDK client IDs.

## 3. Environment variables and builds

Expo reads public app variables with the `EXPO_PUBLIC_` prefix. `VITE_CLERK_PUBLISHABLE_KEY` is a Vite web convention and is not read by this Expo app. The required variable is:

```dotenv
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

For EAS development, preview, and production builds, add this same variable to the matching EAS environment. Replace the current `pk_test_...` value with the production instance's `pk_live_...` key before a store release.

Because the `africlay` URL scheme is native configuration, rebuild the development client when necessary:

```powershell
npx expo prebuild
npx expo run:android
```

On macOS, use `npx expo run:ios` for iOS.

After changing `.env`, fully stop and restart Expo with a cleared bundle cache:

```powershell
npx expo start --clear
```

## 4. Release checks

- A new address receives a six-digit code, wrong/expired codes are rejected, resend works, and the correct code starts onboarding.
- Password login succeeds, including the email challenge shown by Clerk Client Trust on a new device.
- Google login succeeds and cancellation returns cleanly to the login screen.
- Password-reset codes allow the user to choose a new password.
- Closing and reopening the app restores the Clerk session from encrypted native storage.
- Logout removes the active Clerk session.

The `role`, `location`, and onboarding fields are currently stored in Clerk `unsafeMetadata` because users may edit their own profile. Do not use those client-editable values as backend authorization. Enforce seller/admin privileges with server-controlled Clerk metadata and backend checks when the API is added.
