import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables from .env or Vite env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

// Create actual Supabase client if configured, otherwise null
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export interface BackendStatus {
  isConfigured: boolean;
  mode: 'supabase' | 'demo-local';
  url?: string;
}

export function getBackendStatus(): BackendStatus {
  return {
    isConfigured: isSupabaseConfigured,
    mode: isSupabaseConfigured ? 'supabase' : 'demo-local',
    url: isSupabaseConfigured ? supabaseUrl : undefined,
  };
}
