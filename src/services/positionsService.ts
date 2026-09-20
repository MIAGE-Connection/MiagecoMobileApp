import { supabase } from './supabase';

export interface MemberPosition {
  id: string;
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

const COLUMNS = 'id, label, color, sort_order, is_active';

const friendly = (error: any): Error => {
  if (error?.code === '23505') {
    return new Error(
      /color/.test(error.message ?? '')
        ? 'Cette couleur est déjà utilisée par un autre poste.'
        : 'Un poste porte déjà ce nom.'
    );
  }
  // 42P01 : table absente -> le script SQL de la phase 16 n'est pas installé.
  if (error?.code === '42P01' || error?.code === 'PGRST205') {
    return new Error("La table des postes est absente de Supabase : lance le script SQL de la phase 16.");
  }
  return error instanceof Error ? error : new Error(error?.message || 'Opération impossible.');
};

export const positionsService = {
  // Tous les postes (écran d'administration).
  async getAll(): Promise<MemberPosition[]> {
    const { data, error } = await supabase
      .from('member_positions')
      .select(COLUMNS)
      .order('sort_order')
      .order('label');
    if (error) throw friendly(error);
    return data || [];
  },

  // Postes que l'adhérent peut choisir.
  async getActive(): Promise<MemberPosition[]> {
    const { data, error } = await supabase
      .from('member_positions')
      .select(COLUMNS)
      .eq('is_active', true)
      .order('sort_order')
      .order('label');
    if (error) throw friendly(error);
    return data || [];
  },

  // Nombre d'adhérents ayant choisi chaque poste (super admin : lit tous les profils).
  async getUsage(): Promise<Record<string, number>> {
    const { data, error } = await supabase.from('profiles').select('position_id').not('position_id', 'is', null);
    if (error) throw error;
    const usage: Record<string, number> = {};
    (data || []).forEach((row: any) => {
      usage[row.position_id] = (usage[row.position_id] || 0) + 1;
    });
    return usage;
  },

  async create(label: string, color: string, sortOrder: number): Promise<void> {
    const { error } = await supabase
      .from('member_positions')
      .insert({ label: label.trim(), color, sort_order: sortOrder });
    if (error) throw friendly(error);
  },

  async update(id: string, changes: Partial<Pick<MemberPosition, 'label' | 'color' | 'is_active' | 'sort_order'>>): Promise<void> {
    const payload = { ...changes, ...(changes.label !== undefined ? { label: changes.label.trim() } : {}) };
    const { data, error } = await supabase.from('member_positions').update(payload).eq('id', id).select('id');
    if (error) throw friendly(error);
    // Une mise à jour bloquée par la RLS ne renvoie pas d'erreur.
    if (!data?.length) throw new Error('La modification a été refusée par la base (droits insuffisants).');
  },

  // Nouvel ordre d'affichage : la liste reçue devient l'ordre (fonction atomique côté base, phase 18).
  async reorder(ids: string[]): Promise<void> {
    const { error } = await supabase.rpc('reorder_member_positions', { p_ids: ids });
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') {
        throw new Error("Le script SQL de la phase 18 n'a pas encore été lancé dans Supabase.");
      }
      throw friendly(error);
    }
  },

  // Les adhérents qui avaient ce poste se retrouvent sans poste (ON DELETE SET NULL).
  async remove(id: string): Promise<void> {
    const { data, error } = await supabase.from('member_positions').delete().eq('id', id).select('id');
    if (error) throw friendly(error);
    if (!data?.length) throw new Error('La suppression a été refusée par la base (droits insuffisants).');
  },
};
