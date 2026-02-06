import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Demo / mock user for local dev without Supabase env vars
// ---------------------------------------------------------------------------

const DEMO_USER: User = {
  id: 'demo-user',
  email: 'demo@ironsecretary.app',
  user_metadata: { full_name: 'Demo User' },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User;

const DEMO_SESSION: Session = {
  access_token: 'demo-access-token',
  refresh_token: 'demo-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: DEMO_USER,
} as Session;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Supabase is not configured, fall back to a demo user so the app
    // remains functional during local development.
    if (!supabase) {
      setUser(DEMO_USER);
      setSession(DEMO_SESSION);
      setLoading(false);
      return;
    }

    // 1. Check for an existing session on mount.
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    // 2. Subscribe to auth state changes (login, logout, token refresh, etc.).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // -----------------------------------------------------------------------
  // Auth helpers
  // -----------------------------------------------------------------------

  const signIn = async (
    email: string,
    password: string,
  ): Promise<{ error: AuthError | null }> => {
    if (!supabase) return { error: null };

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
  ): Promise<{ error: AuthError | null }> => {
    if (!supabase) return { error: null };

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error };
  };

  const signOut = async (): Promise<void> => {
    if (!supabase) return;

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (
    email: string,
  ): Promise<{ error: AuthError | null }> => {
    if (!supabase) return { error: null };

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  const updatePassword = async (
    password: string,
  ): Promise<{ error: AuthError | null }> => {
    if (!supabase) return { error: null };

    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
}
