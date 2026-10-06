import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Profile, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const DEFAULT_USER: Profile = {
  id: 'usr-default',
  user_id: 'usr-default',
  email: 'info@thecodeyogi.com',
  full_name: 'Super Admin',
  role: 'super_admin',
  designation_title: 'Chief Technology Officer & Founder',
  employment_status: 'active',
  joining_date: '2024-01-01',
  avatar_url: '/favicon (1).ico',
  work_location: 'Headquarters',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

interface AuthState {
  currentUser: Profile;
  isAuthenticated: boolean;
  activeRole: UserRole;
  isLoadingAuth: boolean;
  authError: string | null;
  setCurrentUser: (user: Profile | null) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: DEFAULT_USER,
      isAuthenticated: false,
      activeRole: 'employee',
      isLoadingAuth: true,
      authError: null,

      setCurrentUser: (user: Profile | null) =>
        set({
          currentUser: user || DEFAULT_USER,
          activeRole: user?.role || 'employee',
          isAuthenticated: !!user,
          isLoadingAuth: false,
        }),

      initAuth: async () => {
        // If persisted session is already marked authenticated, keep user in!
        if (get().isAuthenticated && get().currentUser) {
          set({ isLoadingAuth: false });
        }

        if (!supabase || !isSupabaseConfigured) {
          set({ isLoadingAuth: false });
          return;
        }

        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
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
              return;
            }
          }
        } catch (err) {
          console.warn('Auth session check warning:', err);
        }

        // Maintain local authenticated session if established
        if (get().isAuthenticated && get().currentUser) {
          set({ isLoadingAuth: false });
        } else {
          set({ isAuthenticated: false, isLoadingAuth: false });
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoadingAuth: true, authError: null });

        const cleanEmail = email.trim().toLowerCase();
        const cleanPassword = password.trim();

        if (!cleanEmail || !cleanPassword) {
          set({ isLoadingAuth: false, authError: 'Email and password are required' });
          return { success: false, error: 'Email and password are required' };
        }

        // Strict Backend API Authentication via Supabase Auth for ALL accounts (Super Admin, Admins, Employees)
        if (supabase && isSupabaseConfigured) {
          try {
            const { data, error } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: cleanPassword,
            });

            if (error) {
              console.warn('Database authentication failed:', error);
              let detailedMessage = error.message;

              if (error.message?.toLowerCase().includes('database error querying schema') || error.status === 500) {
                detailedMessage = 'Database Auth Error (HTTP 500): Supabase GoTrue auth schema permissions or triggers need repair. Run scripts/fix_supabase_auth.sql in your Supabase SQL Editor.';
              } else if (error.message?.toLowerCase().includes('invalid login credentials') || error.message?.toLowerCase().includes('invalid credentials')) {
                detailedMessage = 'Invalid credentials: The password or email you entered does not match our database records.';
              } else if (error.message?.toLowerCase().includes('email not confirmed')) {
                detailedMessage = 'Account Inactive: Your email address has not been confirmed yet in Supabase Auth.';
              } else if (error.message?.toLowerCase().includes('too many requests') || error.status === 429) {
                detailedMessage = 'Rate Limited: Too many failed login attempts. Please wait 60 seconds before trying again.';
              } else if (error.message?.toLowerCase().includes('user not found')) {
                detailedMessage = 'Account Not Found: No registered employee account matches this email address.';
              }

              set({ isLoadingAuth: false, authError: detailedMessage });
              return { success: false, error: detailedMessage };
            }

            if (data?.user) {
              const { data: dbProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', data.user.email)
                .maybeSingle();

              const userProfile: Profile = dbProfile || {
                id: data.user.id,
                user_id: data.user.id,
                email: data.user.email || cleanEmail,
                full_name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
                role: (data.user.user_metadata?.role as UserRole) || 'employee',
                designation_title: data.user.user_metadata?.designation_title || 'Software Engineer',
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
            }
          } catch (err: any) {
            console.error('Database authentication exception:', err);
            let msg = err.message || 'Database error during authentication';
            if (msg.toLowerCase().includes('database error querying schema')) {
              msg = 'Database Auth Error (HTTP 500): GoTrue schema permissions need repair. Please run scripts/fix_supabase_auth.sql in Supabase SQL Editor.';
            }
            set({ isLoadingAuth: false, authError: msg });
            return { success: false, error: msg };
          }
        }

        set({ isLoadingAuth: false, authError: 'Invalid credentials: No matching account found in the database.' });
        return { success: false, error: 'Invalid credentials: No matching account found in the database.' };
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
        if (!currentUser) return;
        const updated = { ...currentUser, ...updates, updated_at: new Date().toISOString() };
        set({ currentUser: updated });

        if (supabase && isSupabaseConfigured && currentUser.id) {
          await supabase.from('profiles').update(updates).eq('id', currentUser.id);
        }
      },
    }),
    {
      name: 'tcy_auth_store',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        activeRole: state.activeRole,
      }),
    }
  )
);
