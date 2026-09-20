import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
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
  finishingLogin: boolean;
  clearDomainNotAllowed: () => void;
  signInWithGoogle: (loginHint?: string) => Promise<void>;
  signInWithMicrosoft: (loginHint?: string) => Promise<void>;
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
  const [finishingLogin, setFinishingLogin] = useState(false);
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
    if (__DEV__) {
      console.log(
        `[auth] refresh #${seq}`,
        seq !== refreshSeq.current ? 'ignoré (plus récent en cours)' : { user: !!currentUser, role: currentUser?.role, active, cguPending }
      );
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

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (__DEV__) console.log('[auth] évènement', event);
      refresh();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [refresh]);

  // Les droits peuvent changer côté serveur (référent retiré, compte suspendu...) :
  // on relit le profil à chaque retour dans l'app.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') refresh();
    });
    return () => subscription.remove();
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
      if (__DEV__) console.log('[auth] lien reçu :', url ? url.replace(/([?#&](code|access_token|refresh_token)=)[^&]+/g, '$1…') : url);
      if (!url) return;
      // Android livre parfois l'URL sous forme "opaque" (miageconnect:?code=...,
      // sans "//"), donc on compare uniquement le schéma plutôt que le préfixe
      // exact renvoyé par makeRedirectUri().
      if (Linking.parse(url).scheme?.toLowerCase() !== 'miageconnect') return;
      // Le code de connexion est à usage unique : on ne traite jamais deux fois le même lien.
      if (handledUrlRef.current === url) {
        if (__DEV__) console.log('[auth] lien déjà traité, ignoré');
        return;
      }
      handledUrlRef.current = url;
      // Écran de chargement pendant la finalisation : évite de montrer l'accueil une seconde.
      setFinishingLogin(true);
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
      } finally {
        setFinishingLogin(false);
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

  const signInWithGoogle = async (loginHint?: string) => {
    await authService.signInWithProvider('google', loginHint);
    await refresh();
  };

  const signInWithMicrosoft = async (loginHint?: string) => {
    await authService.signInWithProvider('azure', loginHint);
    await refresh();
  };

  const signOut = async () => {
    // Doit passer avant la déconnexion : la suppression du jeton demande une session valide.
    await pushNotificationService.unregisterCurrentDevice();
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
        finishingLogin,
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
