import { supabase } from './supabase';

export interface AllowedDomain {
  domain: string;
  asso_id: string;
  is_active: boolean;
  requested_by: string | null;
  note: string | null;
  added_by: string | null;
  added_at: string;
  disabled_at: string | null;
  associations?: { name: string } | null;
}

export interface AssociationOption {
  id: string;
  name: string;
}

export const domainsService = {
  async getAllDomains(): Promise<AllowedDomain[]> {
    const { data, error } = await supabase
      .from('allowed_domains')
      .select('*, associations(name)')
      .order('added_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getAssociationOptions(): Promise<AssociationOption[]> {
    const { data, error } = await supabase
      .from('associations')
      .select('id, name')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async addDomain(domain: string, assoId: string, note?: string): Promise<void> {
    const { error } = await supabase.from('allowed_domains').insert({
      domain: domain.trim().toLowerCase(),
      asso_id: assoId,
      note: note?.trim() || null,
    });

    if (error) throw error;
  },

  async setDomainActive(domain: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('allowed_domains')
      .update({
        is_active: isActive,
        disabled_at: isActive ? null : new Date().toISOString(),
      })
      .eq('domain', domain);

    if (error) throw error;
  },
};
