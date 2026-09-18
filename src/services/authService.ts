import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from './supabase';
import { User } from '../types/user';

WebBrowser.maybeCompleteAuthSession();

export const oauthRedirectPrefix = AuthSession.makeRedirectUri({ scheme: 'miageconnect' });

// Levée quand le compte OAuth a bien été créé côté Supabase mais que le
// domaine de l'adresse n'est (plus) rattaché à aucune association fédérée
// (ex: domaine désactivé entre la création du compte et cet appel).
export class DomainNotAllowedError extends Error {
  constructor() {
    super('DOMAIN_NOT_ALLOWED');
    this.name = 'DomainNotAllowedError';
  }
}

async function mapProfileToUser(userId: string, email: string): Promise<User> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, associations(name)')
    .eq('id', userId)
    .single();

  return {
    id: userId,
    email,
    associationName: profile?.associations?.name || '',
    associationId: profile?.association_id || '',
    role: profile?.role || 'member',
    position_in_association: profile?.position_in_association,
    contact_email: profile?.contact_email,
    graduation_year: profile?.graduation_year,
  };
}

// Termine la connexion à partir de l'URL de retour (miageconnect://...#access_token=
// ou ?code=...). Appelée soit juste après la fermeture du navigateur (web),
// soit par le listener global de deep link (natif) — voir AuthContext, car sur
// Android le process peut être tué par l'OS pendant que l'utilisateur est sur
// l'écran Google, ce qui rend inutilisable la promesse initiale du bouton.
export async function completeOAuthRedirect(url: string): Promise<User> {
  const callbackUrl = new URL(url);
  const code = callbackUrl.searchParams.get('code');
  const hashParams = new URLSearchParams(callbackUrl.hash.replace(/^#/, ''));

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
  } else if (hashParams.get('access_token')) {
    const { error: setError } = await supabase.auth.setSession({
      access_token: hashParams.get('access_token')!,
      refresh_token: hashParams.get('refresh_token') || '',
    });
    if (setError) throw setError;
  } else if (hashParams.get('error_description')) {
    throw new Error(decodeURIComponent(hashParams.get('error_description')!));
  } else {
    throw new Error('Réponse de connexion invalide');
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Session introuvable après connexion');

  // Rattache/crée le profil via le domaine autorisé et pose valid_until.
  const { error: ensureError } = await supabase.rpc('ensure_my_profile');
  if (ensureError) {
    await supabase.auth.signOut();
    throw new DomainNotAllowedError();
  }

  return mapProfileToUser(session.user.id, session.user.email || '');
}

export const authService = {
  // Seule voie d'entrée désormais : OAuth Google ou Microsoft, filtré par
  // domaine côté base (trigger "before user created" + ensure_my_profile()).
  //
  // Web : flux classique, on attend la fermeture du popup puis on termine
  // l'échange nous-mêmes.
  // Natif (Android/iOS) : on ouvre juste le navigateur système et on rend la
  // main. Le retour est intercepté globalement par AuthContext via Linking,
  // ce qui fonctionne même si Android tue le process pendant l'auth.
  async signInWithProvider(provider: 'google' | 'azure'): Promise<User | null> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: oauthRedirectPrefix,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data?.url) throw new Error('Impossible de démarrer la connexion');

    if (Platform.OS === 'web') {
      const result = await WebBrowser.openAuthSessionAsync(data.url, oauthRedirectPrefix);
      if (result.type !== 'success' || !('url' in result)) {
        throw new Error('Connexion annulée');
      }
      return completeOAuthRedirect(result.url);
    }

    WebBrowser.openAuthSessionAsync(data.url, oauthRedirectPrefix).catch(() => {});
    return null;
  },

  logout: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  getCurrentUser: async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    return mapProfileToUser(session.user.id, session.user.email || '');
  },

  isActiveMember: async (): Promise<boolean> => {
    const { data, error } = await supabase.rpc('is_active_member');
    if (error) {
      console.error('Error checking membership status:', error);
      return false;
    }
    return Boolean(data);
  },

  // Renouvellement : la session OAuth est toujours valide, on relance juste
  // ensure_my_profile() pour repousser valid_until (si le domaine est
  // toujours actif).
  renewMembership: async (): Promise<User> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Utilisateur non authentifié');

    const { error } = await supabase.rpc('ensure_my_profile');
    if (error) throw new DomainNotAllowedError();

    return mapProfileToUser(session.user.id, session.user.email || '');
  },

  updateUserProfile: async (updates: {
    position_in_association?: string;
    contact_email?: string;
    graduation_year?: number;
  }): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Utilisateur non authentifié');

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id);

    if (error) throw error;
  },
};
