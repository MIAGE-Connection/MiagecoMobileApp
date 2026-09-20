import { supabase } from './supabase';

export const eventInterestService = {
  // Événements que l'adhérent connecté a marqués « Intéressé ».
  async getMyInterestIds(): Promise<Set<string>> {
    const { data, error } = await supabase.from('event_interests').select('event_id');
    if (error) throw error;
    return new Set((data || []).map((row: { event_id: string }) => row.event_id));
  },

  async setInterested(eventId: string, userId: string, interested: boolean): Promise<void> {
    if (interested) {
      const { error } = await supabase.from('event_interests').insert({ event_id: eventId, user_id: userId });
      // 23505 : déjà marqué, rien à faire.
      if (error && error.code !== '23505') throw error;
    } else {
      const { error } = await supabase.from('event_interests').delete().eq('event_id', eventId).eq('user_id', userId);
      if (error) throw error;
    }
  },

  // Totaux par événement : super admin = tous, référent = ceux de son association.
  async getCounts(): Promise<Record<string, number>> {
    const { data, error } = await supabase.rpc('event_interest_counts');
    if (error) throw error;
    const counts: Record<string, number> = {};
    (data || []).forEach((row: { event_id: string; total: number | string }) => {
      counts[row.event_id] = Number(row.total);
    });
    return counts;
  },
};
