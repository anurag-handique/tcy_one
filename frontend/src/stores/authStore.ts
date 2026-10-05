import { create } from 'zustand';
import { Profile, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { INITIAL_PROFILES } from '../lib/mockData';

interface AuthState {
  currentUser: Profile;
  isAuthenticated: boolean;
  activeRole: UserRole;
  isLoadingAuth: boolean;
  authError: string | null;
  setCurrentUser: (user: Profile) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  currentUser: INITIAL_PROFILES[0],
  isAuthenticated: false,
  activeRole: 'super_admin',
  isLoadingAuth: true,
  authError: null,

  setCurrentUser: (user: Profile) =>
    set({
      currentUser: user,
      activeRole: user.role,
      isAuthenticated: true,
    }),

  initAuth: async () => {
    set({ isLoadingAuth: true });

    if (!supabase || !isSupabaseConfigured) {
      // Fallback for offline sandbox
      set({
        currentUser: INITIAL_PROFILES[0],
        isAuthenticated: true,
        activeRole: 'super_admin',
        isLoadingAuth: false,
      });
      return;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        set({ isAuthenticated: false, isLoadingAuth: false });
        return;
      }

      // Fetch user profile from Supabase
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', session.user.email)
        .maybeSingle();

      if (profile) {
        set({
          currentUser: profile,
          activeRole: profile.role,
          isAuthenticated: true,
          isLoadingAuth: false,
        });
      } else {
        // Fallback user if profile table is being initialized
        const fallbackUser: Profile = {
          id: session.user.id,
          user_id: session.user.id,
          email: session.user.email || 'info@thecodeyogi.com',
          full_name: session.user.user_metadata?.full_name || 'The Code Yogi (Super Admin)',
          role: (session.user.user_metadata?.role as UserRole) || 'super_admin',
          employment_status: 'active',
          joining_date: new Date().toISOString().split('T')[0],
          avatar_url: '/favicon (1).ico',
          work_location: 'Headquarters',
          created_at: session.user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set({
          currentUser: fallbackUser,
          activeRole: fallbackUser.role,
          isAuthenticated: true,
          isLoadingAuth: false,
        });
      }
    } catch (err: any) {
      console.error('Auth initialization error:', err);
      set({ isAuthenticated: false, isLoadingAuth: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoadingAuth: true, authError: null });

    if (!supabase || !isSupabaseConfigured) {
      if (email === 'info@thecodeyogi.com' && password === 'TCY@2026') {
        set({
          currentUser: INITIAL_PROFILES[0],
          activeRole: 'super_admin',
          isAuthenticated: true,
          isLoadingAuth: false,
        });
        return { success: true };
      }
      set({ isLoadingAuth: false, authError: 'Invalid credentials' });
      return { success: false, error: 'Invalid credentials' };
    }

    try {
      // 1. Call real Supabase Auth API
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        set({ isLoadingAuth: false, authError: error.message });
        return { success: false, error: error.message };
      }

      if (!data.user) {
        set({ isLoadingAuth: false, authError: 'No user returned from authentication' });
        return { success: false, error: 'Authentication failed' };
      }

      // 2. Fetch real profile from Supabase profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', data.user.email)
        .maybeSingle();

      const userProfile: Profile = profile || {
        id: data.user.id,
        user_id: data.user.id,
        email: data.user.email || email,
        full_name: data.user.user_metadata?.full_name || 'The Code Yogi (Super Admin)',
        role: (data.user.user_metadata?.role as UserRole) || 'super_admin',
        employment_status: 'active',
        joining_date: new Date().toISOString().split('T')[0],
        avatar_url: '/favicon (1).ico',
        work_location: 'Headquarters',
        created_at: data.user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      set({
        currentUser: userProfile,
        activeRole: userProfile.role,
        isAuthenticated: true,
        isLoadingAuth: false,
        authError: null,
      });

      return { success: true };
    } catch (err: any) {
      const msg = err.message || 'Failed to authenticate with Supabase';
      set({ isLoadingAuth: false, authError: msg });
      return { success: false, error: msg };
    }
  },

  logout: async () => {
    if (supabase && isSupabaseConfigured) {
      await supabase.auth.signOut().catch(() => {});
    }
    set({
      isAuthenticated: false,
      authError: null,
    });
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { currentUser } = get();
    const updated = { ...currentUser, ...updates, updated_at: new Date().toISOString() };
    set({ currentUser: updated });

    if (supabase && isSupabaseConfigured && currentUser.id) {
      await supabase.from('profiles').update(updates).eq('id', currentUser.id);
    }
  },
}));
