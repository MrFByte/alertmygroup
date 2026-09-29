import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'amg_install_dismissed';

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

type Platform = 'android' | 'ios';

export default function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISSED_KEY)) return;

    const onBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform('android');
    };
    const onAppInstalled = () => {
      localStorage.setItem(DISMISSED_KEY, '1');
      setPlatform(null);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    // iOS has no install-prompt event, so show the manual-instructions
    // banner directly (after a short delay so it doesn't flash on load).
    let iosTimer: number | undefined;
    if (isIos()) {
      iosTimer = window.setTimeout(() => setPlatform('ios'), 1500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setPlatform(null);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (!platform) return null;

  return (
    <div
      className="fixed left-4 right-4 z-50 max-w-lg mx-auto"
      style={{ bottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
    >
      <div className="nm-flat rounded-2xl p-4 flex items-center gap-3" style={{ borderLeft: '3px solid var(--nm-accent)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--nm-bg)', boxShadow: '0 0 0 2px var(--nm-accent)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-nm-accent">
            <path d="M12 3v12"/>
            <path d="m7 10 5 5 5-5"/>
            <path d="M5 19h14"/>
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-nm font-semibold text-sm">For the best experience, install AlertMyGroup</p>
          <p className="text-nm-muted text-xs mt-0.5">
            {platform === 'ios'
              ? <>Tap <span className="font-semibold">Share</span>, then <span className="font-semibold">Add to Home Screen</span>.</>
              : 'Get full-screen ringing and background alerts.'}
          </p>
        </div>

        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {platform === 'android' && (
            <button
              onClick={handleInstall}
              className="nm-btn-success px-3 py-2 rounded-xl text-xs font-bold text-nm-success focus:outline-none"
            >
              Install
            </button>
          )}
          <button
            onClick={dismiss}
            className="text-nm-muted text-xs underline focus:outline-none"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
