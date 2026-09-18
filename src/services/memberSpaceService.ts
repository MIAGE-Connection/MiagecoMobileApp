import { supabase } from './supabase';

export interface MemberDocument {
  id: string;
  asso_id: string | null;
  title: string;
  description: string | null;
  file_url: string;
  category: string | null;
  created_at: string;
}

export interface DirectoryMember {
  id: string;
  full_name: string | null;
  position_in_association: string | null;
  association_id: string;
  graduation_year: number | null;
  contact_email: string | null;
  is_referent: boolean;
}

export const memberSpaceService = {
  async getDocuments(): Promise<MemberDocument[]> {
    const { data, error } = await supabase
      .from('member_documents')
      .select('id, asso_id, title, description, file_url, category, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getDirectory(): Promise<DirectoryMember[]> {
    const { data, error } = await supabase
      .from('profiles_public_view')
      .select('id, full_name, position_in_association, association_id, graduation_year, contact_email, is_referent')
      .order('full_name');

    if (error) throw error;
    return data || [];
  },
};
