import { useEffect, useRef, useState } from 'react';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type OfflineState = 'preparing' | 'ready' | 'unavailable' | 'error';
export function usePwa() {
  const [offline, setOffline] = useState<OfflineState>('preparing');
  const [online, setOnline] = useState(() => navigator.onLine);
  const [updateReady, setUpdateReady] = useState(false);
  const [installed, setInstalled] = useState(() => matchMedia('(display-mode: standalone)').matches);
  const [canInstall, setCanInstall] = useState(false);
  const [installNotice, setInstallNotice] = useState('');
  const prompt = useRef<InstallPrompt | null>(null);
  const retry = useRef<() => void>(() => {});

  useEffect(() => {
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    const cleanup: (() => void)[] = [];
    const queryStatus = async () => {
      if (!('serviceWorker' in navigator)) return;
      const worker = registration?.active;
      if (!worker || worker.state !== 'activated') return;
      const channel = new MessageChannel();
      const timer = window.setTimeout(() => {
        channel.port1.close();
        if (!disposed) setOffline('error');
      }, 8_000);
      channel.port1.onmessage = event => {
        if (event.data?.type !== 'OFFLINE_STATUS') return;
        window.clearTimeout(timer);
        channel.port1.close();
        if (!disposed) setOffline(event.data.offlineReady === true ? 'ready' : 'error');
      };
      try { worker.postMessage({ type: 'GET_OFFLINE_STATUS' }, [channel.port2]); }
      catch { window.clearTimeout(timer); channel.port1.close(); if (!disposed) setOffline('error'); }
      cleanup.push(() => { window.clearTimeout(timer); channel.port1.close(); });
    };
    const observeWorker = (worker: ServiceWorker | null) => {
      if (!worker) return;
      const changed = () => {
        if (disposed) return;
        const active = registration?.active;
        const waiting = registration?.waiting;
        setUpdateReady(Boolean(active && (
          (waiting && waiting !== active) || (worker.state === 'installed' && worker !== active)
        )));
        if (worker.state === 'activated') void queryStatus();
        if (worker.state === 'redundant' && !registration?.active) setOffline('error');
      };
      worker.addEventListener('statechange', changed);
      cleanup.push(() => worker.removeEventListener('statechange', changed));
      changed();
    };
    const register = async () => {
      if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) {
        setOffline('unavailable'); return;
      }
      try {
        const next = await navigator.serviceWorker.register('/manabi-sugoroku/sw.js', {
          scope: '/manabi-sugoroku/', updateViaCache: 'none',
        });
        if (disposed) return;
        registration = next;
        setUpdateReady(Boolean(next.waiting && next.active && next.waiting !== next.active));
        observeWorker(next.installing);
        observeWorker(next.active);
        const found = () => observeWorker(next.installing);
        next.addEventListener('updatefound', found);
        cleanup.push(() => next.removeEventListener('updatefound', found));
        void queryStatus();
      } catch { if (!disposed) setOffline('error'); }
    };
    retry.current = () => { setOffline('preparing'); void register(); };
    const offered = (event: Event) => {
      event.preventDefault(); prompt.current = event as InstallPrompt; setCanInstall(true);
    };
    const added = () => { setInstalled(true); setCanInstall(false); prompt.current = null; };
    const connection = () => { setOnline(navigator.onLine); if (navigator.onLine) void queryStatus(); };
    const message = (event: MessageEvent) => { if (event.data?.type === 'OFFLINE_READY') void queryStatus(); };
    // A controller change only refreshes status. It must never reload an active adventure.
    const controller = () => { void queryStatus(); };
    window.addEventListener('beforeinstallprompt', offered);
    window.addEventListener('appinstalled', added);
    window.addEventListener('online', connection);
    window.addEventListener('offline', connection);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', message);
      navigator.serviceWorker.addEventListener('controllerchange', controller);
    }
    void register();
    return () => {
      disposed = true; cleanup.forEach(remove => remove());
      window.removeEventListener('beforeinstallprompt', offered);
      window.removeEventListener('appinstalled', added);
      window.removeEventListener('online', connection);
      window.removeEventListener('offline', connection);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', message);
        navigator.serviceWorker.removeEventListener('controllerchange', controller);
      }
    };
  }, []);

  async function install() {
    const event = prompt.current;
    if (!event) return;
    prompt.current = null; setCanInstall(false);
    try {
      await event.prompt();
      const result = await event.userChoice;
      setInstallNotice(result.outcome === 'accepted' ? 'アプリを ついかしたよ。' : 'いまは このまま あそべるよ。');
    } catch { setInstallNotice('ブラウザの メニューから「アプリをインストール」を ためしてね。'); }
  }
  return { offline, online, updateReady, installed, canInstall, installNotice, install, retry: () => retry.current() };
}

export type Pwa = ReturnType<typeof usePwa>;
