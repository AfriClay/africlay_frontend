# Android development over USB

The development build needs two servers: Expo on 8081 and Django on 8000.
Starting Expo does not start Django. USB forwarding is temporary and can be
lost when the phone disconnects, restarts, or the ADB server restarts.

Start Docker Desktop and the backend from back_end/Africlay-server:

```powershell
docker compose up -d backend
```

Connect the phone, enable USB debugging and approve the computer. From front_end:

```powershell
npm run android:usb
```

This checks Django, restores both forwarding rules, and starts Expo on a fixed
localhost port. It requires the AfriClay development build already installed.
`npm run android` uses this same USB workflow. Use `npm run android:build`
only when the native app needs rebuilding, then stop its Metro server and use
`npm run android` for the localhost launch.
Use EXPO_PUBLIC_API_URL=http://localhost:8000/api for this USB workflow.

If Expo is already running on 8081, or USB was reconnected, use:

```powershell
npm run android:connect
```

This checks both servers, restores forwarding, and opens the app with the
explicit localhost URL instead of a remembered Wi-Fi address. Do not start
a second Expo server or accept a different port for this workflow.

Web uses http://localhost:8081. Keep USB connected while using the phone.
This is a local development setup, not a production hosting solution.
