import { createRoot } from "react-dom/client";
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import App from "./App.tsx";
import "./globals.css";

if (Capacitor.isNativePlatform()) {
  let handledUrl = '';
  const handleAuthUrl = async (url: string) => {
    if (url === handledUrl) return;
    let callback: URL;
    try { callback = new URL(url); } catch { return; }
    if (callback.protocol !== 'edvora:' || callback.hostname !== 'auth' || callback.pathname !== '/callback') return;
    handledUrl = url;
    const code = callback.searchParams.get('code');
    if (code) await supabase.auth.exchangeCodeForSession(code);
    else {
      const tokens = new URLSearchParams(callback.hash.slice(1));
      const access_token = tokens.get('access_token');
      const refresh_token = tokens.get('refresh_token');
      if (access_token && refresh_token) await supabase.auth.setSession({ access_token, refresh_token });
    }
    window.history.replaceState({}, '', '/auth/callback');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
  void NativeApp.addListener('appUrlOpen', ({ url }) => { void handleAuthUrl(url); });
  void NativeApp.getLaunchUrl().then(launch => { if (launch?.url) void handleAuthUrl(launch.url); });
}

createRoot(document.getElementById("root")!).render(<App />);
