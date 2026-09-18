import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { authService, DomainNotAllowedError } from '../services/authService';
import { pushNotificationService } from '../services/pushNotificationService';
import { User } from '../types/user';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isActiveMember: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signOut: () => Promise<void>;
  renewMembership: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isActiveMember, setIsActiveMember] = useState(false);
  const registeredForPushRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
    setIsActiveMember(currentUser ? await authService.isActiveMember() : false);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [refresh]);

  useEffect(() => {
    if (!user || !isActiveMember) {
      registeredForPushRef.current = null;
      return;
    }
    if (registeredForPushRef.current === user.id) {
      return;
    }
    registeredForPushRef.current = user.id;
    pushNotificationService.registerForPushNotifications(user.id).catch((error) => {
      console.error('AuthContext: push registration failed', error);
    });
  }, [user, isActiveMember]);

  const signInWithGoogle = async () => {
    await authService.signInWithProvider('google');
    await refresh();
  };

  const signInWithMicrosoft = async () => {
    await authService.signInWithProvider('azure');
    await refresh();
  };

  const signOut = async () => {
    await authService.logout();
    setUser(null);
    setIsActiveMember(false);
  };

  const renewMembership = async () => {
    await authService.renewMembership();
    await refresh();
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, isActiveMember, signInWithGoogle, signInWithMicrosoft, signOut, renewMembership, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  return ctx;
};

export { DomainNotAllowedError };
