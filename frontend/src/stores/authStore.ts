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
              console.warn('Authentication failed:', error);
              let detailedMessage = 'Unable to sign in. Please check your credentials and try again.';

              if (error.message?.toLowerCase().includes('email not confirmed')) {
                detailedMessage = 'Account Pending Activation: Your email address has not been verified yet. Please check your inbox or contact your organization administrator.';
              } else if (
                error.message?.toLowerCase().includes('invalid login credentials') ||
                error.message?.toLowerCase().includes('invalid credentials') ||
                error.message?.toLowerCase().includes('user not found')
              ) {
                detailedMessage = 'Invalid credentials: The email or password entered is incorrect.';
              } else if (error.message?.toLowerCase().includes('too many requests') || error.status === 429) {
                detailedMessage = 'Too Many Attempts: Access temporarily throttled. Please wait a minute before trying again.';
              } else if (error.status === 500 || error.message?.toLowerCase().includes('database error')) {
                detailedMessage = 'Authentication Service Unavailable: Unable to process request. Please try again later or contact IT support.';
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
            console.error('Authentication exception:', err);
            const msg = 'Authentication Service Unavailable: Unable to process request. Please try again later.';
            set({ isLoadingAuth: false, authError: msg });
            return { success: false, error: msg };
          }
        }

        set({ isLoadingAuth: false, authError: 'Invalid credentials: The email or password entered is incorrect.' });
        return { success: false, error: 'Invalid credentials: The email or password entered is incorrect.' };
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
