import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type NewContentKind = 'member_documents' | 'notification_history';

const storageKey = (kind: NewContentKind) => `lastSeen:${kind}`;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

// « Nouveau / non lu » = créé depuis la dernière ouverture de l'écran
// correspondant (mémorisé sur le téléphone, purement indicatif).
export const newContentService = {
  // Les écrans et les compteurs se mettent à jour dès qu'un contenu est marqué comme lu.
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  async getLastSeen(kind: NewContentKind): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(storageKey(kind));
    } catch {
      return null;
    }
  },

  async markSeen(kind: NewContentKind): Promise<void> {
    try {
      await AsyncStorage.setItem(storageKey(kind), new Date().toISOString());
    } catch {
      // indicatif seulement
    }
    notify();
  },

  async countNew(kind: NewContentKind): Promise<number> {
    try {
      let since = await AsyncStorage.getItem(storageKey(kind));
      // Notifications : une nouvelle installation ne doit pas afficher tout
      // l'historique passé comme « non lu ».
      if (!since && kind === 'notification_history') {
        since = new Date().toISOString();
        await AsyncStorage.setItem(storageKey(kind), since);
      }
      let query = supabase.from(kind).select('id', { count: 'exact', head: true });
      if (since) query = query.gt('created_at', since);
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    } catch {
      return 0;
    }
  },

  async countAll(): Promise<Record<NewContentKind, number>> {
    const [member_documents, notification_history] = await Promise.all([
      this.countNew('member_documents'),
      this.countNew('notification_history'),
    ]);
    return { member_documents, notification_history };
  },
};
