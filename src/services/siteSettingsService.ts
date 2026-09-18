import { supabase } from './supabase';

export interface HomeStatSetting {
  label: string;
  value: string;
}

// Trois blocs de chiffres, dans l'ordre d'affichage de l'accueil.
export const HOME_STAT_SLOTS = 3;

const key = (slot: number, field: 'label' | 'value') => `home_stat_${slot}_${field}`;

export const siteSettingsService = {
  // Purement visuel : un champ vide = valeur par défaut (chiffre réel / libellé d'origine).
  // Ne fait jamais échouer l'accueil (table absente, réseau...).
  async getHomeStats(): Promise<HomeStatSetting[]> {
    const empty = Array.from({ length: HOME_STAT_SLOTS }, () => ({ label: '', value: '' }));
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value')
        .like('key', 'home_stat_%');
      if (error) throw error;

      const map = new Map((data || []).map((r: { key: string; value: string }) => [r.key, r.value]));
      return empty.map((_, i) => ({
        label: map.get(key(i + 1, 'label')) || '',
        value: map.get(key(i + 1, 'value')) || '',
      }));
    } catch (error) {
      console.error('Error fetching home stats settings:', error);
      return empty;
    }
  },

  async saveHomeStats(stats: HomeStatSetting[]): Promise<void> {
    const now = new Date().toISOString();
    const rows = stats.flatMap((s, i) => [
      { key: key(i + 1, 'label'), value: s.label.trim(), updated_at: now },
      { key: key(i + 1, 'value'), value: s.value.trim(), updated_at: now },
    ]);
    const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' });
    if (error) throw error;
  },
};
