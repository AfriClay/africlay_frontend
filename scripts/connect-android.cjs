const { existsSync } = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const sdkRoots = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
].filter(Boolean);
const executable = process.platform === 'win32' ? 'adb.exe' : 'adb';
const adb = sdkRoots.map(root => path.join(root, 'platform-tools', executable))
  .find(candidate => existsSync(candidate)) || executable;

async function main() {
  const launch = process.argv.includes('--launch');
  const response = await fetch('http://127.0.0.1:8000/api/auth/me/', {
    signal: AbortSignal.timeout(5000),
  });
  if (response.status !== 401) {
    throw new Error(`Expected Django's unauthenticated response (401), received ${response.status}.`);
  }
  if (launch) {
    const metro = await fetch('http://127.0.0.1:8081/status', { signal: AbortSignal.timeout(5000) });
    if (!metro.ok || !(await metro.text()).includes('packager-status:running')) {
      throw new Error('Expo is not running on 8081. Use npm run android:usb to start it.');
    }
  }

  const devices = execFileSync(adb, ['devices'], { encoding: 'utf8' })
    .split(/\r?\n/)
    .map(line => line.trim().split(/\s+/))
    .filter(([, state]) => state === 'device')
    .map(([serial]) => serial);
  if (!devices.length) {
    throw new Error('Connect the Android device and accept its USB debugging prompt.');
  }
  for (const serial of devices) {
    execFileSync(adb, ['-s', serial, 'reverse', 'tcp:8000', 'tcp:8000'], { stdio: 'pipe' });
    execFileSync(adb, ['-s', serial, 'reverse', 'tcp:8081', 'tcp:8081'], { stdio: 'pipe' });
    console.log(`USB forwarding restored for ${serial}: API 8000 and Expo 8081`);
    if (launch) {
      execFileSync(adb, ['-s', serial, 'shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW',
        '-d', 'africlay://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081',
        'com.africlay.appfront'], { stdio: 'pipe' });
    }
  }
  console.log('Django is reachable. Keep USB connected. Run npm run android:connect after reconnecting USB or restarting the phone.');
}

main().catch(error => {
  console.error(`Android API setup failed: ${error.message}`);
  console.error('Ensure Dockerized Django is running on port 8000 and USB debugging is enabled.');
  process.exitCode = 1;
});
