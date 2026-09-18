import { supabase } from './supabase';

export type NotificationRecurrence = 'once' | 'weekly' | 'biweekly';

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  send_at: string;
  recurrence: NotificationRecurrence;
  is_active: boolean;
  last_sent_at: string | null;
  last_status: 'pending' | 'sent' | 'failed' | null;
  last_sent_count: number | null;
  last_error: string | null;
  created_at: string;
}

export const scheduledNotificationService = {
  async list(): Promise<ScheduledNotification[]> {
    const { data, error } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .order('send_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async create(input: {
    title: string;
    body: string;
    sendAt: Date;
    recurrence: NotificationRecurrence;
  }): Promise<void> {
    const { error } = await supabase.from('scheduled_notifications').insert({
      title: input.title,
      body: input.body,
      send_at: input.sendAt.toISOString(),
      recurrence: input.recurrence,
    });
    if (error) throw error;
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('scheduled_notifications')
      .update({ is_active: isActive })
      .eq('id', id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('scheduled_notifications').delete().eq('id', id);
    if (error) throw error;
  },
};
