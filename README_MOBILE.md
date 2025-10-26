# YieldPilot Mobile Development Guide

This guide covers building native iOS and Android apps using Capacitor.

## Current Status: PWA (Progressive Web App)

YieldPilot is currently configured as a Progressive Web App with:
- ✅ Offline support via Service Worker
- ✅ Installable from browser (home screen)
- ✅ App-like experience
- ✅ Works on all devices (iPhone, Android, desktop)

### Installing the PWA

Users can install YieldPilot directly from their browser:

**iPhone/iPad:**
1. Open YieldPilot in Safari
2. Tap the Share button
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

**Android Chrome:**
1. Open YieldPilot in Chrome
2. Tap the menu (⋮)
3. Tap "Add to Home screen"
4. Tap "Add"

Or visit `/install` in the app for guided installation.

## Upgrading to Native Mobile Apps (Future)

When you need native app store distribution or advanced device features, follow these steps to wrap YieldPilot in Capacitor.

### Prerequisites

- Node.js 18+ installed
- Git installed
- For iOS: macOS with Xcode 14+ installed
- For Android: Android Studio installed

### Step 1: Export to GitHub

1. In Lovable, click the **GitHub** button (top right)
2. Export your project to a new GitHub repository
3. Clone the repository locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd YOUR_REPO
   ```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Install Capacitor

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npm install -D @capacitor/cli
```

### Step 4: Initialize Capacitor

```bash
npx cap init
```

When prompted, use these values:
- **App name**: `YieldPilot`
- **App ID**: `app.lovable.yieldpilot` (or your own bundle ID)
- **Web directory**: `dist`

### Step 5: Configure Capacitor

Create or update `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.yieldpilot',
  appName: 'YieldPilot',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#00B2A9",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    }
  }
};

export default config;
```

### Step 6: Build the Web App

```bash
npm run build
```

### Step 7: Add Native Platforms

**For iOS:**
```bash
npx cap add ios
npx cap update ios
```

**For Android:**
```bash
npx cap add android
npx cap update android
```

### Step 8: Sync Web Assets

After any code changes, sync to native projects:

```bash
npm run build
npx cap sync
```

### Step 9: Run on Device/Emulator

**iOS (macOS only):**
```bash
npx cap run ios
```
This opens Xcode. Click the Play button to run on simulator or connected device.

**Android:**
```bash
npx cap run android
```
This opens Android Studio. Click the Play button to run on emulator or connected device.

## Development Workflow

### During Development (Hot Reload)

For faster development, you can use live reload from your dev server:

1. Update `capacitor.config.ts` to include server config:
   ```typescript
   server: {
     url: 'https://2344bbae-b4f9-4188-9b5d-3f7134fe896c.lovableproject.com?forceHideBadge=true',
     cleartext: true
   }
   ```

2. Sync and run:
   ```bash
   npx cap sync
   npx cap run ios  # or android
   ```

The app will load from your Lovable preview URL with live updates.

**⚠️ Important**: Remove the `server` config before building for production!

### Production Builds

1. Remove server config from `capacitor.config.ts`
2. Build the web app: `npm run build`
3. Sync to native: `npx cap sync`
4. Open in IDE: `npx cap open ios` or `npx cap open android`
5. Build for release in Xcode/Android Studio

## Native Features Available with Capacitor

Once wrapped in Capacitor, you can add:

### Core Plugins (Official)
```bash
# Camera
npm install @capacitor/camera

# Push Notifications
npm install @capacitor/push-notifications

# Geolocation
npm install @capacitor/geolocation

# File System
npm install @capacitor/filesystem

# Share
npm install @capacitor/share

# Haptics (vibration)
npm install @capacitor/haptics

# Status Bar
npm install @capacitor/status-bar

# Keyboard
npm install @capacitor/keyboard
```

### Example: Adding Camera Support

```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

const takePicture = async () => {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri
  });
  
  return image.webPath;
};
```

After installing plugins, always run:
```bash
npx cap sync
```

## App Store Submission

### iOS App Store

1. Open project in Xcode: `npx cap open ios`
2. Configure signing & capabilities
3. Update version number in `Info.plist`
4. Archive the app (Product → Archive)
5. Upload to App Store Connect
6. Submit for review

### Google Play Store

1. Open project in Android Studio: `npx cap open android`
2. Generate signed APK/AAB
3. Update version in `android/app/build.gradle`
4. Upload to Google Play Console
5. Submit for review

## Troubleshooting

### iOS Build Issues
- Ensure Xcode is updated
- Run `pod install` in `ios/App` directory
- Clean build: Product → Clean Build Folder in Xcode

### Android Build Issues
- Check Android SDK is installed
- Update Gradle if prompted
- Invalidate caches: File → Invalidate Caches / Restart in Android Studio

### Sync Issues
```bash
# Clean and rebuild
rm -rf node_modules dist
npm install
npm run build
npx cap sync
```

## Offline Functionality

YieldPilot's PWA includes offline support:

**What works offline:**
- Home page shell
- Previously viewed deals (read-only)
- Deal summaries already generated
- UI navigation

**What requires internet:**
- New deal searches
- Generating AI summaries
- PDF exports
- Syncing new properties
- User authentication

The service worker caches:
- Static assets (HTML, CSS, JS, images)
- API responses for 5 minutes
- Deal images for 30 days

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Development Guide](https://capacitorjs.com/docs/ios)
- [Android Development Guide](https://capacitorjs.com/docs/android)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)
- [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)

## Support

For Capacitor-specific issues:
- GitHub: https://github.com/ionic-team/capacitor/issues
- Forum: https://forum.ionicframework.com/c/capacitor

For YieldPilot app issues:
- GitHub: (Your repo)
- Email: support@yieldpilot.com
