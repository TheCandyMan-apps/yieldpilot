import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Check, Smartphone, X } from "lucide-react";
import { isPWA, promptInstall } from "@/lib/pwa";
import { Link } from "react-router-dom";

export default function Install() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    setIsInstalled(isPWA());
    
    // Check if install prompt is available
    const checkInstallability = () => {
      const deferredPrompt = (window as any).deferredPrompt;
      setCanInstall(!!deferredPrompt);
    };

    checkInstallability();
    window.addEventListener('beforeinstallprompt', checkInstallability);

    return () => {
      window.removeEventListener('beforeinstallprompt', checkInstallability);
    };
  }, []);

  const handleInstall = () => {
    promptInstall();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20 p-4">
      <div className="container mx-auto max-w-2xl py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <X className="h-4 w-4" />
          Back to Home
        </Link>

        <Card className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Install YieldPilot</h1>
              <p className="text-muted-foreground">Get the app experience on your device</p>
            </div>
          </div>

          {isInstalled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">App is installed!</p>
                  <p className="text-sm text-green-700 dark:text-green-300">You're using YieldPilot as an app</p>
                </div>
              </div>
              
              <Link to="/">
                <Button className="w-full" size="lg">
                  Continue to App
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="text-xl font-semibold">Benefits of Installing</h2>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Access YieldPilot from your home screen</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Works offline for viewing saved deals</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Faster loading and app-like experience</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>No app store required - install directly</span>
                  </li>
                </ul>
              </div>

              {canInstall ? (
                <Button 
                  onClick={handleInstall} 
                  className="w-full" 
                  size="lg"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Install YieldPilot
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Manual Installation:</p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p><strong>iPhone/iPad:</strong> Tap the Share button, then "Add to Home Screen"</p>
                      <p><strong>Android Chrome:</strong> Tap the menu (⋮), then "Add to Home screen"</p>
                      <p><strong>Android Firefox:</strong> Tap the menu, then "Install"</p>
                    </div>
                  </div>
                  
                  <Link to="/">
                    <Button variant="outline" className="w-full" size="lg">
                      Continue in Browser
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>YieldPilot works on all devices and browsers</p>
          <p className="mt-2">Installing gives you the best experience</p>
        </div>
      </div>
    </div>
  );
}
