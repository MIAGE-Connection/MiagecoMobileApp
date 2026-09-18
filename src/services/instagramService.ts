import { supabase } from './supabase';
import { News } from '../types/news';

export const instagramService = {
  getLatestNews: async (): Promise<News[]> => {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur lors de la récupération des news:', error);
      throw error;
    }

    // On formate les données pour correspondre à notre interface News
    return data.map((item: any) => ({
      id: item.id,
      title: item.title,
      date: new Date(item.created_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      description: item.description,
      imageUrl: item.image_url,
      instagramUrl: item.instagram_url,
    }));
  },
};
