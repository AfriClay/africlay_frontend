# AfriClay authentication setup

The app code is wired to Supabase Auth for email/password accounts, six-digit email verification, password-reset email delivery, securely persisted native sessions, and Google OAuth. The app intentionally shows a configuration error until the two Supabase environment variables are supplied.

## 1. Create and connect Supabase

1. Create a project at https://database.new.
2. In the project dashboard, open **Connect** and copy the Project URL and Publishable key.
3. Copy `.env.example` to `.env` and set:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
   ```

Only use the publishable key in the mobile app. Never add the service-role key or Google client secret to `.env` or any `EXPO_PUBLIC_` variable.

For EAS builds, create the same two `EXPO_PUBLIC_` environment variables in the EAS project/environment used by the build.

## 2. Turn on real email verification

1. In Supabase, open **Authentication > Sign In / Providers > Email**.
2. Enable Email and enable **Confirm email**. Do not enable automatic confirmation.
3. Open **Authentication > Email Templates > Confirm signup**.
4. Use `{{ .Token }}` in the template so Supabase sends the six-digit code expected by the app. A minimal template is:

   ```html
   <h2>Verify your AfriClay email</h2>
   <p>Enter this code in the AfriClay app:</p>
   <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">{{ .Token }}</p>
   <p>This code expires soon. If you did not create an account, you can ignore this email.</p>
   ```

5. Open **Authentication > Emails > SMTP Settings**, enable custom SMTP, and enter the SMTP host, port, username, password, sender email, and sender name supplied by your transactional-email provider. Resend, Postmark, AWS SES, SendGrid, Brevo, and similar SMTP services work.
6. Verify your sending domain with that provider and add its SPF and DKIM DNS records. Add DMARC before production.
7. In **Authentication > Rate Limits**, set email limits appropriate for expected signup/reset traffic. The initial custom-SMTP limit is low.

Supabase's built-in mailer is only useful for limited team testing. A custom SMTP provider is required to deliver verification emails reliably to real customers.

## 3. Enable Google login

1. Create or select a project in Google Cloud, then open **Google Auth Platform**.
2. Configure Branding, Audience, and Data Access. The app only needs `openid`, email, and profile scopes.
3. While the OAuth app is in testing mode, add every Google account that will test it as a test user. Publish it when ready for public use.
4. Create an OAuth client with application type **Web application**.
5. In Google, add this Authorized redirect URI, using the exact callback shown on Supabase's Google provider page:

   ```text
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

6. Copy the Google Client ID and Client Secret into **Supabase > Authentication > Sign In / Providers > Google**, then enable the provider. The secret stays in Supabase and must never be placed in the app.
7. In **Supabase > Authentication > URL Configuration**, add this redirect URL:

   ```text
   africlay://auth/callback
   ```

   `africlay://**` is also suitable if more authentication deep links are added later.

## 4. Rebuild and test

The custom `africlay` scheme is native configuration, so rebuild the development client after changing `app.json`:

```powershell
npx expo prebuild
npx expo run:android
```

Use `npx expo run:ios` on macOS for iOS. Google OAuth should be tested in a development/preview build rather than relying on Expo Go.

Test these cases before release:

- A new email receives a six-digit code, a wrong code is rejected, resend works after the cooldown, and the correct code completes onboarding.
- An unverified email cannot log in with a password.
- Google login succeeds, cancellation returns cleanly to the login screen, and logout removes the session.
- Closing and reopening the app restores a valid session.
- Verification and reset emails reach Gmail and at least one non-Gmail provider without landing in spam.

The app's mobile OAuth callback is exported by `authService.redirectUri`; it should resolve to `africlay://auth/callback` in development and production native builds.
