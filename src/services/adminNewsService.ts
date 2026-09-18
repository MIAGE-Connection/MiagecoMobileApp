import { supabase } from './supabase';

export interface AdminNews {
  id: string;
  title: string;
  description: string;
  category: string;
  icon_name: string;
  url?: string;
  order_index: number;
  is_published?: boolean;
  published_at: string;
  updated_at: string;
}

export const adminNewsService = {
  async getAllNews(): Promise<AdminNews[]> {
    try {
      const { data, error } = await supabase
        .from('admin_news')
        .select('*')
        .eq('is_published', true)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching admin news:', error);
      return [];
    }
  },
};
