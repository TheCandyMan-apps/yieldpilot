import { Workbox } from 'workbox-window';

let wb: Workbox | undefined;

export function registerServiceWorker() {
  // Only register service worker in production to avoid dev MIME type errors
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    wb = new Workbox('/sw.js');

    wb.addEventListener('installed', (event) => {
      if (event.isUpdate) {
        console.log('New service worker installed, will activate on next page load');
        // Optionally show update notification to user
      }
    });

    wb.addEventListener('activated', (event) => {
      if (!event.isUpdate) {
        console.log('Service worker activated for the first time');
      }
    });

    wb.register().catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  }
}

export function checkForUpdates() {
  if (wb) {
    wb.update();
  }
}

// Check if app is installed as PWA
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

// Prompt to install PWA
export function promptInstall() {
  // This will be set by beforeinstallprompt event
  const deferredPrompt = (window as any).deferredPrompt;
  
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      (window as any).deferredPrompt = null;
    });
  }
}

// Listen for beforeinstallprompt event
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).deferredPrompt = e;
  });
}
