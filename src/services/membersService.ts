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

  // 'member' <-> 'admin_association' uniquement : promouvoir/rétrograder un
  // admin_national se fait volontairement à la main en SQL (action trop
  // sensible pour un bouton).
  async setReferentRole(memberId: string, role: 'member' | 'admin_association'): Promise<void> {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', memberId);
    if (error) throw error;
  },
};
