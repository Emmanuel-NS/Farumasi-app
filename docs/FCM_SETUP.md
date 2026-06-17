# Firebase Cloud Messaging (FCM) Setup

Instant push notifications when the app is **force-stopped** or the **screen is off** require Firebase on the client and a service account on the API.

## 1. Create a Firebase project

> **Note:** The app builds **without** `google-services.json`. Polling/foreground-service alerts still work. Add Firebase only when you want instant push after force-stop.

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Create a project (or use an existing one)
3. Add an **Android app** with package name: `com.farumasi.farumasi_app`
4. Download **`google-services.json`** and place it at:
   ```
   android/app/google-services.json
   ```
   (Copy from `android/app/google-services.json.example` and replace values, or use FlutterFire CLI below.)

## 2. Flutter app (recommended: FlutterFire CLI)

```bash
dart pub global activate flutterfire_cli
flutterfire configure
```

This generates `lib/firebase_options.dart` with real values and downloads `google-services.json`.

**Manual build** (without FlutterFire): pass defines when building:

```bash
flutter run --release \
  --dart-define=FIREBASE_API_KEY=your_api_key \
  --dart-define=FIREBASE_APP_ID=1:123456:android:abc \
  --dart-define=FIREBASE_MESSAGING_SENDER_ID=123456789 \
  --dart-define=FIREBASE_PROJECT_ID=your-project-id
```

You still need `android/app/google-services.json` for Android builds.

## 3. API server (Render / production)

1. Firebase Console → **Project settings** → **Service accounts**
2. Click **Generate new private key** (downloads a JSON file)
3. Set on the API host:

```env
FCM_ENABLED=true
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
```

For **Render**, paste the **entire JSON on one line**, or base64-encode it:

```bash
# PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("path\to\service-account.json"))
```

Set `FIREBASE_SERVICE_ACCOUNT_JSON` to that base64 string.

4. Redeploy the API.

## 4. Test

1. Build and install the app on a physical phone (emulator FCM is limited)
2. Log in as a patient
3. From pharmacist portal, send a consult message **or** change an order status
4. Force-stop FARUMASI from Android Settings → Apps
5. Trigger the event again — notification should appear within seconds

## How it works

| Layer | Role |
|-------|------|
| **FCM** | Instant delivery when app is killed (primary) |
| **Foreground service** | Polling fallback when FCM is not configured |
| **In-app polling** | Updates badge while app is open |

The app registers its FCM token at `PUT /api/v1/users/me/fcm-token` after login. The API sends push on:

- Order / payment / delivery notifications (`NotificationService.send`)
- Pharmacist consult messages (`POST /consultations/{id}/messages`)

## Troubleshooting

- **No push after force-stop**: Confirm `google-services.json` matches package `com.farumasi.farumasi_app` and API has valid `FIREBASE_SERVICE_ACCOUNT_JSON`
- **Push works in debug but not release**: Use the same Firebase Android app; add SHA-1/SHA-256 fingerprints in Firebase Console → Project settings → Your apps
- **Token not registered**: Check logcat for `FCM token register failed` — user must be logged in
- **Notifications disabled**: User Settings → Notifications → Push must be enabled
