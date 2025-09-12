import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password:string, userData: any) => Promise<{ error: any }>;
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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      // First, sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            fullName: userData.fullName,
            role: 'owner', // Set role in metadata for the trigger
          }
        }
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        return { error: signUpError };
      }
      
      if (!authData.user) {
        const err = new Error("Signup succeeded but no user data was returned.");
        console.error(err);
        return { error: err };
      }

      // Second, create the restaurant entry
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

      if (restaurantError || !newRestaurant) {
        console.error('Restaurant creation error:', restaurantError);
        return { error: restaurantError || new Error("Failed to create restaurant and get its ID.") };
      }

      // Third, create a default branch for the new restaurant
      const { error: branchError } = await supabase
        .from('branches')
        .insert([{
            restaurant_id: newRestaurant.id,
            name: 'Main Branch'
        }]);

      if (branchError) {
          console.error('Default branch creation error:', branchError);
          return { error: branchError };
      }

      // Fourth, update the user's profile (created by a trigger) with the new restaurant_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ restaurant_id: newRestaurant.id })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Profile update error after signup:', profileError);
      }

      return { error: null };

    } catch (error) {
      console.error('Unexpected signup error:', error);
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
    if (error) {
      console.error('Signout error:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
