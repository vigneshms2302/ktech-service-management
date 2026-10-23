import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  });
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsInstallGuideOpen(false);
      console.log('K-Connect Desktop / Mobile PWA installed successfully.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = useCallback(async (): Promise<{ installed: boolean; outcome?: 'accepted' | 'dismissed' }> => {
    if (isInstalled) {
      return { installed: true, outcome: 'accepted' };
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
          setIsInstalled(true);
          return { installed: true, outcome: 'accepted' };
        }
        return { installed: false, outcome: 'dismissed' };
      } catch (err) {
        console.error('Error triggering PWA install prompt:', err);
      }
    }

    // If native prompt is not available (e.g. desktop Chrome already showed or browser requires manual step)
    setIsInstallGuideOpen(true);
    return { installed: false };
  }, [deferredPrompt, isInstalled]);

  return {
    isInstallable: Boolean(deferredPrompt) || !isInstalled,
    isInstalled,
    triggerInstall,
    isInstallGuideOpen,
    setIsInstallGuideOpen,
  };
}
