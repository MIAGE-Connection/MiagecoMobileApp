import { supabase } from './supabase';

export interface FeaturedEvent {
  id: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  ticket_url?: string;
  program_url?: string;
  image_url?: string;
  stats?: string;
  is_published: boolean;
}

export const featuredEventService = {
  async getFeaturedEvent(): Promise<FeaturedEvent | null> {
    try {
      const { data, error } = await supabase
        .from('featured_events')
        .select('*')
        .eq('is_published', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching featured event:', error);
      throw error;
    }
  },

  async updateFeaturedEvent(id: string, updates: Partial<FeaturedEvent>): Promise<FeaturedEvent> {
    const { data, error } = await supabase
      .from('featured_events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
