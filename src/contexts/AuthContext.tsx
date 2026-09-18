import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '../services/supabase';
import { authService, completeOAuthRedirect, DomainNotAllowedError } from '../services/authService';
import { pushNotificationService } from '../services/pushNotificationService';
import { User } from '../types/user';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isActiveMember: boolean;
  domainNotAllowed: boolean;
  clearDomainNotAllowed: () => void;
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
  const [domainNotAllowed, setDomainNotAllowed] = useState(false);
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

  // Sur Android, l'app peut être tuée par l'OS pendant que l'utilisateur est
  // sur l'écran Google/Microsoft (le flux peut prendre du temps). Le retour
  // se fait alors dans une toute nouvelle instance JS, donc la promesse du
  // bouton de connexion (dans authService.signInWithProvider) n'existe plus.
  // On intercepte ici, globalement et indépendamment du bouton, à la fois le
  // cas "app relancée à froid" (getInitialURL) et "app encore en vie" (event).
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handleUrl = async (url: string | null) => {
      if (!url) return;
      // Android livre parfois l'URL sous forme "opaque" (miageconnect:?code=...,
      // sans "//"), donc on compare uniquement le schéma plutôt que le préfixe
      // exact renvoyé par makeRedirectUri().
      if (Linking.parse(url).scheme?.toLowerCase() !== 'miageconnect') return;
      try {
        await completeOAuthRedirect(url);
        await refresh();
      } catch (err) {
        if (err instanceof DomainNotAllowedError) {
          setDomainNotAllowed(true);
        } else {
          console.error('AuthContext: OAuth redirect handling failed', err);
        }
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', (event) => handleUrl(event.url));

    return () => {
      subscription.remove();
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

  const clearDomainNotAllowed = () => setDomainNotAllowed(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isActiveMember,
        domainNotAllowed,
        clearDomainNotAllowed,
        signInWithGoogle,
        signInWithMicrosoft,
        signOut,
        renewMembership,
        refresh,
      }}
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
