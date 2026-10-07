import React from 'react';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from './routes';
import { useDataStore } from './stores/dataStore';
import { useAuthStore } from './stores/authStore';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

// In desktop Electron apps (file:// protocol), BrowserRouter fails to match filesystem paths.
// We conditionally use HashRouter for desktop Electron while keeping standard routing for Web/PWA.
const isDesktopOrFile =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'file:' ||
    Boolean((window as any).electronAPI?.isElectron) ||
    navigator.userAgent.includes('Electron'));

const RouterComponent = isDesktopOrFile ? HashRouter : BrowserRouter;

export function App() {
  const { fetchSupabaseData } = useDataStore();
  const { initAuth } = useAuthStore();

  React.useEffect(() => {
    // Purge legacy mock storage
    try {
      localStorage.removeItem('tcy_data_storage');
      localStorage.removeItem('tcy_auth_storage');
    } catch (e) {}

    initAuth();
    if (isSupabaseConfigured) {
      fetchSupabaseData();
    }

    // Listen to Supabase auth state changes
    if (supabase && isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          initAuth();
          fetchSupabaseData();
        } else if (event === 'SIGNED_OUT') {
          initAuth();
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [fetchSupabaseData, initAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterComponent>
        <AppRoutes />
      </RouterComponent>
    </QueryClientProvider>
  );
}

export default App;
