import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.2344bbaeb4f941889b5d3f7134fe896c',
  appName: 'yieldpilot',
  webDir: 'dist',
  server: {
    url: 'https://2344bbae-b4f9-4188-9b5d-3f7134fe896c.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
