import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type NewContentKind = 'member_documents' | 'notification_history';

const storageKey = (kind: NewContentKind) => `lastSeen:${kind}`;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

// « Nouveau / non lu » (mémorisé sur le téléphone, purement indicatif) :
//  * documents : créé depuis la dernière ouverture de l'écran ;
//  * notifications : reçue depuis la première ouverture de l'app ET pas encore touchée dans
//    « Non lues » (lecture notification par notification, voir markRead).
const readKey = (kind: NewContentKind) => `readIds:${kind}`;
const MAX_READ_IDS = 300; // on ne garde que les plus récents : l'historique affiché n'en compte que 50
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

  async getReadIds(kind: NewContentKind): Promise<Set<string>> {
    try {
      const raw = await AsyncStorage.getItem(readKey(kind));
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  },

  // Marque des éléments précis comme lus (notifications touchées dans « Non lues »).
  async markRead(kind: NewContentKind, ids: string[]): Promise<void> {
    try {
      const current = await this.getReadIds(kind);
      ids.forEach((id) => {
        current.delete(id); // ré-insertion : l'id devient le plus récent
        current.add(id);
      });
      await AsyncStorage.setItem(readKey(kind), JSON.stringify([...current].slice(-MAX_READ_IDS)));
    } catch {
      // indicatif seulement
    }
    notify();
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
      if (kind === 'notification_history') {
        const [{ data, error: listError }, readIds] = await Promise.all([
          supabase
            .from(kind)
            .select('id')
            .gt('created_at', since as string)
            .order('created_at', { ascending: false })
            .limit(200),
          this.getReadIds(kind),
        ]);
        if (listError) throw listError;
        return (data || []).filter((row: { id: string }) => !readIds.has(row.id)).length;
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
