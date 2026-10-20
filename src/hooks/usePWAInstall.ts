import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// Tangkap event sebelum React mount agar event dari browser mobile tidak terlewat
let capturedPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    capturedPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((listener) => listener(capturedPrompt));
  });

  window.addEventListener("appinstalled", () => {
    capturedPrompt = null;
    listeners.forEach((listener) => listener(null));
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => capturedPrompt,
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Deteksi apakah sudah terpasang (Mode Standalone)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://");

    setIsInstalled(isStandalone);

    // 2. Deteksi perangkat iOS / iPadOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

    setIsIOS(isIOSDevice && !isStandalone);

    // 3. Sinkronisasi prompt dengan module-level capturedPrompt
    const handlePromptUpdate = (p: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(p);
    };

    listeners.add(handlePromptUpdate);
    if (capturedPrompt && !deferredPrompt) {
      setDeferredPrompt(capturedPrompt);
    }

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      capturedPrompt = null;
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      listeners.delete(handlePromptUpdate);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [deferredPrompt]);

  const install = async () => {
    const prompt = deferredPrompt || capturedPrompt;
    if (!prompt) return false;

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
        capturedPrompt = null;
        return true;
      }
    } catch (err) {
      console.warn("[PWA] Error memunculkan install prompt:", err);
    }
    return false;
  };

  return {
    isInstallable: !!(deferredPrompt || capturedPrompt),
    isInstalled,
    isIOS,
    install,
  };
}
