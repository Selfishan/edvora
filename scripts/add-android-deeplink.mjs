import { readFile, writeFile } from 'node:fs/promises';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let manifest = await readFile(manifestPath, 'utf8');
const activity = manifest.match(/<activity\b[^>]*>/);
if (!activity) throw new Error('Could not find the Capacitor main activity in AndroidManifest.xml');
if (manifest.includes('android:scheme="edvora"')) process.exit(0);
const deepLink = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="edvora" android:host="auth" android:path="/callback" />
            </intent-filter>`;
manifest = manifest.replace(activity[0], `${activity[0]}${deepLink}`);
await writeFile(manifestPath, manifest);
