import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { UserProfile, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole;
  isLoading: boolean;
  error: string | null;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role?: UserRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('public');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, department:departments(*)')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Profile fetch error:', error.message);
        return null;
      }
      return data as UserProfile;
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      return null;
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    // Get current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const userProf = await fetchProfile(session.user.id);
        if (isMounted) {
          setProfile(userProf);
          setRole(userProf?.role ?? 'citizen');
        }
      } else {
        setProfile(null);
        setRole('public');
      }
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          const userProf = await fetchProfile(newSession.user.id);
          if (isMounted) {
            setProfile(userProf);
            setRole(userProf?.role ?? 'citizen');
          }
        } else {
          setProfile(null);
          setRole('public');
        }
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    if (!isSupabaseConfigured || !supabase) {
      const err = new Error('Supabase is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.');
      setError(err.message);
      return { error: err };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return { error };
      }

      if (data.user) {
        const userProf = await fetchProfile(data.user.id);
        setProfile(userProf);
        setRole(userProf?.role ?? 'citizen');
      }

      return { error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected authentication error occurred.';
      setError(errorMessage);
      return { error: new Error(errorMessage) };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, requestedRole: UserRole = 'citizen') => {
    setError(null);
    if (!isSupabaseConfigured || !supabase) {
      const err = new Error('Supabase is not configured. Please set environment variables.');
      setError(err.message);
      return { error: err };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: requestedRole,
          },
        },
      });

      if (error) {
        setError(error.message);
        return { error };
      }

      // Check if profile was created via database trigger or needs direct insertion
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: data.user.email!,
            full_name: fullName,
            role: requestedRole,
          });

        if (profileError) {
          console.warn('Profile creation notice:', profileError.message);
        }

        const userProf = await fetchProfile(data.user.id);
        setProfile(userProf);
        setRole(userProf?.role ?? requestedRole);
      }

      return { error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed.';
      setError(errorMessage);
      return { error: new Error(errorMessage) };
    }
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole('public');
  };

  const refreshProfile = async () => {
    if (user) {
      const userProf = await fetchProfile(user.id);
      setProfile(userProf);
      setRole(userProf?.role ?? 'citizen');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isLoading,
        error,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

