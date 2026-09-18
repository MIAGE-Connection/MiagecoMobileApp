import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { goToAccountTab } from '../navigation/navigationRef';
import { supabase } from '../services/supabase';
import { authService, completeOAuthRedirect, DomainNotAllowedError } from '../services/authService';
import { pushNotificationService } from '../services/pushNotificationService';
import { legalService } from '../services/legalService';
import { User } from '../types/user';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isActiveMember: boolean;
  needsCgu: boolean;
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
  const [needsCgu, setNeedsCgu] = useState(false);
  const [domainNotAllowed, setDomainNotAllowed] = useState(false);
  const registeredForPushRef = useRef<string | null>(null);

  // Plusieurs rechargements peuvent se chevaucher (événements d'auth, fin de
  // connexion...) : seul le plus récent a le droit d'écrire l'état.
  const refreshSeq = useRef(0);
  const handledUrlRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const seq = ++refreshSeq.current;
    const currentUser = await authService.getCurrentUser();
    let active = false;
    let cguPending = false;
    if (currentUser) {
      [active, cguPending] = await Promise.all([
        authService.isActiveMember(),
        legalService.needsCguAcceptance(),
      ]);
    }
    if (seq !== refreshSeq.current) return;
    setUser(currentUser);
    setIsActiveMember(active);
    setNeedsCgu(cguPending);
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
      // Le code de connexion est à usage unique : on ne traite jamais deux fois le même lien.
      if (handledUrlRef.current === url) return;
      handledUrlRef.current = url;
      try {
        await completeOAuthRedirect(url);
        await refresh();
        goToAccountTab();
      } catch (err: any) {
        if (err instanceof DomainNotAllowedError) {
          setDomainNotAllowed(true);
          goToAccountTab();
        } else {
          console.error('AuthContext: OAuth redirect handling failed', err);
          // Rendre l'échec visible : sans ça l'utilisateur revient simplement à l'accueil.
          Alert.alert('Connexion impossible', err?.message || 'Une erreur est survenue pendant la connexion.');
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
    refreshSeq.current++;
    handledUrlRef.current = null;
    setUser(null);
    setIsActiveMember(false);
    setNeedsCgu(false);
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
        needsCgu,
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
