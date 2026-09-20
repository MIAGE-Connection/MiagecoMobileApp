import { supabase } from './supabase';

export interface DeletionRequest {
  id: string;
  // Vide une fois le compte supprimé : la demande est conservée sans lien vers la personne.
  user_id: string | null;
  requested_at: string;
  status: 'pending' | 'processed' | 'cancelled';
  processed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: 'member' | 'admin' | null;
  profiles: {
    email: string;
    full_name: string | null;
    associations: { name: string } | null;
  } | null;
}

export interface MyDeletionRequest {
  id: string;
  requested_at: string;
}

// 42883 / PGRST202 : fonction absente -> le script SQL de la phase 17 n'est pas installé.
const friendly = (error: any): Error => {
  if (error?.code === 'PGRST202' || error?.code === '42883') {
    return new Error("Le script SQL de la phase 17 n'a pas encore été lancé dans Supabase.");
  }
  return error instanceof Error ? error : new Error(error?.message || 'Opération impossible.');
};

export const deletionRequestsService = {
  // --- Super admin (lecture par RLS, annulation par fonction contrôlée) ---

  async list(): Promise<DeletionRequest[]> {
    const { data, error } = await supabase
      .from('account_deletion_requests')
      .select(
        'id, user_id, requested_at, status, processed_at, cancelled_at, cancelled_by, profiles(email, full_name, associations(name))'
      )
      .order('requested_at', { ascending: false });

    if (error) throw error;
    return (data as unknown as DeletionRequest[]) || [];
  },

  async countPending(): Promise<number> {
    const { count, error } = await supabase
      .from('account_deletion_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) throw error;
    return count || 0;
  },

  // Annulation à la demande de l'adhérent (il a contacté l'admin).
  async cancel(id: string): Promise<void> {
    const { data, error } = await supabase.rpc('cancel_deletion_request', { p_id: id });
    if (error) throw friendly(error);
    if (!data) throw new Error("Cette demande n'est plus en attente.");
  },

  // --- Adhérent ---

  // Sa demande en cours, s'il y en a une. Le filtre sur user_id est nécessaire : le super admin lit toutes les demandes.
  async getMine(userId: string): Promise<MyDeletionRequest | null> {
    const { data, error } = await supabase
      .from('account_deletion_requests')
      .select('id, requested_at')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async request(): Promise<void> {
    const { error } = await supabase.rpc('request_account_deletion');
    if (error) throw friendly(error);
  },

  async cancelMine(): Promise<void> {
    const { error } = await supabase.rpc('cancel_my_deletion_request');
    if (error) throw friendly(error);
  },
};
