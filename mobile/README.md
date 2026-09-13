# CycleCare mobile

CycleCare is the Expo/TypeScript mobile client for the existing FastAPI backend.

## Start the backend

From the repository root:

```powershell
$env:CYCLECARE_SEED_DEMO="1"
python -m uvicorn app.api:app --reload
```

The opt-in seed creates these development accounts with password `cyclecare123`:

- Harini: `harini@cyclecare.local` (daughter)
- Aarthi: `aarthi@cyclecare.local` (sister)
- Hemalatha: `hemalatha@cyclecare.local` (mother, read-only)

Set `MENSTRUAL_AGENT_SECRET` before using shared or production environments.

## Start Expo

```powershell
cd mobile
$env:EXPO_PUBLIC_API_URL="http://10.0.2.2:8000" # Android emulator
npm start
```

For a physical phone, use the host computer's LAN IP, for example `http://192.168.1.20:8000`.
For iOS simulator or web on the same computer, `http://127.0.0.1:8000` is usually appropriate.

The mobile client stores the token in Expo SecureStore, requests period data from the backend, and never calculates or submits a client-owned `user_id`.

## Notifications

Reminder settings are saved per authenticated daughter through `/reminders/settings`.
The backend reconciles one active schedule per notification type whenever settings or a period changes. The native client requests notification permission when settings are saved, then schedules the backend-approved dates with `expo-notifications`.

Web preview saves sessions in `localStorage`, but native OS notifications are unavailable on Expo Web. Use an Android/iOS development build to validate delivered notifications and tap routing. Mom accounts cannot access reminder settings or receive daughter period reminders.

## Native Android notification test

This requires Android Studio, an Android SDK, and either a USB-debugging Android device or an emulator. From `mobile/`:

```powershell
npx expo run:android
```

Then log in as Aarthi, open Profile > Reminder settings, allow notifications, and press the development-only `CycleCare Test Reminder` action. It schedules a local test notification for about 10 seconds later. Minimize the app, wait for `CycleCare Test Reminder`, and tap it. The app should open Record a period without recording anything until the user presses Record period.

Mom accounts do not have Reminder settings and cannot create period-check-in notifications.
