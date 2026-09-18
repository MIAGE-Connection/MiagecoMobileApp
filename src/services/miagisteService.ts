import { supabase } from './supabase';
import { MIAGiste } from '../types/miagiste';

export const miagisteService = {
  async fetchMiagistes(): Promise<MIAGiste[]> {
    // We fetch miagistes and join with profiles to get email and association info
    const { data, error } = await supabase
      .from('miagistes')
      .select(`
        id,
        full_name,
        specialization,
        graduation_year,
        role,
        profiles (
          id,
          email,
          association_id,
          associations (
            id,
            name
          )
        )
      `)
      .order('full_name');

    if (error) {
      console.error('Error fetching miagistes:', error);
      throw error;
    }

    // Map the Supabase response to the MIAGiste interface
    return data.map((item: any) => ({
      id: item.id,
      fullName: item.full_name,
      email: item.profiles?.email || 'N/A',
      associationId: item.profiles?.associations?.id || '',
      associationName: item.profiles?.associations?.name || 'Indépendant',
      role: item.role,
      graduationYear: item.graduation_year,
      specialization: item.specialization,
    }));
  }
};
