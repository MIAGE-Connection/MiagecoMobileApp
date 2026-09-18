import { supabase } from './supabase';

export const adminNotificationService = {
  // Réservé à admin_national (vérifié côté Edge Function, pas seulement ici).
  async sendBroadcast(title: string, body: string): Promise<number> {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: { title, body },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data?.sent ?? 0;
  },
};
