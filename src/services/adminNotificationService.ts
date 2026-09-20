import { supabase } from './supabase';

export const adminNotificationService = {
  // Réservé à admin_national (vérifié côté Edge Function, pas seulement ici).
  // `preference` : réglage de l'adhérent à respecter (announcements par défaut).
  async sendBroadcast(
    title: string,
    body: string,
    preference: 'announcements' | 'events_reminders' | 'federation_news' = 'announcements'
  ): Promise<number> {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: { title, body, preference },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data?.sent ?? 0;
  },
};
