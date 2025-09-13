import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError, SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  ownerSignUp: (email: string, password:string, userData: any) => Promise<{ error: any }>;
  staffSignUp: (email: string, password: string, userData: { fullName: string; phone: string; }) => Promise<{ error: any; }>;
  signIn: (email: string, password: string) => Promise<{ data: { user: User | null; session: Session | null; } | null; error: AuthError | null; }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const ownerSignUp = async (email: string, password: string, userData: any) => {
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            fullName: userData.fullName,
            role: 'owner',
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Signup succeeded but no user data was returned.");

      const { data: newRestaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert([{
          name: userData.restaurantName,
          slug: userData.restaurantSlug,
          owner_id: authData.user.id,
          phone: userData.phone,
          address: userData.address
        }])
        .select('id')
        .single();

      if (restaurantError || !newRestaurant) throw restaurantError || new Error("Failed to create restaurant.");

      await supabase
        .from('branches')
        .insert([{ restaurant_id: newRestaurant.id, name: 'Main Branch' }]);

      await supabase
        .from('profiles')
        .update({ restaurant_id: newRestaurant.id })
        .eq('id', authData.user.id);

      return { error: null };
    } catch (error) {
      console.error('Owner signup error:', error);
      return { error };
    }
  };

  const staffSignUp = async (email: string, password: string, userData: { fullName: string; phone: string; }) => {
    try {
      const credentials: SignUpWithPasswordCredentials = {
        email,
        password,
        options: {
          data: {
            fullName: userData.fullName,
            phone: userData.phone,
            role: 'waiter', // Default role, owner can change later
          }
        }
      };
      const { error: signUpError } = await supabase.auth.signUp(credentials);

      if (signUpError) throw signUpError;
      
      return { error: null };

    } catch (error) {
      console.error('Staff signup error:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Signout error:', error);
  };

  const value = {
    user,
    session,
    loading,
    ownerSignUp,
    staffSignUp,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
