import { supabase } from './supabase';

export interface DeletionRequest {
  id: string;
  user_id: string;
  requested_at: string;
  status: 'pending' | 'processed';
  processed_at: string | null;
  profiles: {
    email: string;
    full_name: string | null;
    associations: { name: string } | null;
  } | null;
}

// Lecture/mise à jour réservées à l'admin fédération (RLS de account_deletion_requests).
export const deletionRequestsService = {
  async list(): Promise<DeletionRequest[]> {
    const { data, error } = await supabase
      .from('account_deletion_requests')
      .select('id, user_id, requested_at, status, processed_at, profiles(email, full_name, associations(name))')
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

  async markProcessed(id: string): Promise<void> {
    const { error } = await supabase
      .from('account_deletion_requests')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },
};
