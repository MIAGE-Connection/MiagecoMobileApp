import { supabase } from './supabase';

export const statsService = {
  async getAssociationsCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('associations')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching associations count:', error);
      return 0;
    }
  },

  async getUnreadNewsCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('is_published', true);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread news count:', error);
      return 0;
    }
  },

  async getUpcomingEventsCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true)
        .gte('start_date', new Date().toISOString());

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching upcoming events count:', error);
      return 0;
    }
  },

  async getTotalNewsCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching total news count:', error);
      return 0;
    }
  },
};
