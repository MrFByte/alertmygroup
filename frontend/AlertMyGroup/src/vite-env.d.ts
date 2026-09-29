/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VAPID_PUBLIC_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Android/Chrome's custom install prompt — not yet part of lib.dom.d.ts.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
  appinstalled: Event;
}

interface Navigator {
  // iOS Safari's flag for "already launched from the Home Screen".
  readonly standalone?: boolean;
}
