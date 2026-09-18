import { supabase } from './supabase';

export interface Member {
  id: string;
  email: string;
  full_name: string | null;
  role: 'member' | 'admin_association' | 'admin_national';
  is_suspended: boolean;
  valid_until: string | null;
  position_in_association: string | null;
}

export interface ReferentInfo {
  id: string;
  email: string;
  full_name: string | null;
  association_id: string;
}

export const membersService = {
  async getMembersForAssociation(associationId: string): Promise<Member[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, is_suspended, valid_until, position_in_association')
      .eq('association_id', associationId)
      .order('email');

    if (error) throw error;
    return data || [];
  },

  // Admin national uniquement (RLS) : un référent par association.
  async getAllReferents(): Promise<ReferentInfo[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, association_id')
      .eq('role', 'admin_association')
      .not('association_id', 'is', null);

    if (error) throw error;
    return data || [];
  },

  // Nomme `memberId` référent de son association et retire le rôle à l'ancien
  // référent (une seule personne à la fois). Utilisable par le référent actuel
  // (transfert) ou par l'admin fédération : contrôlé côté base (assign_referent).
  async assignReferent(memberId: string): Promise<void> {
    const { error } = await supabase.rpc('assign_referent', { p_member_id: memberId });
    if (error) {
      // PGRST202 : la fonction n'existe pas -> le script SQL de la phase 7 n'est pas installé.
      if (error.code === 'PGRST202') {
        throw new Error("La fonction assign_referent est absente de Supabase : lance le script SQL de la phase 7.");
      }
      throw error;
    }
  },

  // Suspendre / réactiver un adhérent (admin fédération : garde-fous en base).
  async setSuspended(memberId: string, suspended: boolean): Promise<void> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_suspended: suspended })
      .eq('id', memberId)
      .select('id, is_suspended');
    if (error) throw error;
    // Une mise à jour bloquée (RLS / garde-fou) ne renvoie pas d'erreur : on vérifie le résultat.
    if (!data?.length || data[0].is_suspended !== suspended) {
      throw new Error("La modification a été refusée par la base (droits insuffisants).");
    }
  },

  // 'member' <-> 'admin_association' uniquement : promouvoir/rétrograder un
  // admin_national se fait volontairement à la main en SQL (action trop
  // sensible pour un bouton).
  async setReferentRole(memberId: string, role: 'member' | 'admin_association'): Promise<void> {
    const { data, error } = await supabase.from('profiles').update({ role }).eq('id', memberId).select('id, role');
    if (error) throw error;
    if (!data?.length || data[0].role !== role) {
      throw new Error("La modification a été refusée par la base (droits insuffisants).");
    }
  },
};
