import { supabase } from './supabase';
import { buildDirectoryFilter } from '../utils/directorySearch';

export interface MemberDocument {
  id: string;
  asso_id: string | null;
  title: string;
  description: string | null;
  file_url: string;
  category: string | null;
  created_at: string;
}

export const DIRECTORY_PAGE_SIZE = 40;

export interface DirectoryMember {
  id: string;
  full_name: string | null;
  position_in_association: string | null;
  association_id: string;
  graduation_year: number | null;
  contact_email: string | null;
  is_referent: boolean;
  position_color: string | null; // null = ancien texte libre
  association_name: string | null;
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

  // Annuaire par pages, du plus ancien au plus récent nom : la liste peut grossir sans rien ralentir
  // (la base plafonne de toute façon à 1 000 lignes par requête). La recherche se fait côté serveur.
  async getDirectoryPage(offset: number, search: string = ''): Promise<{ rows: DirectoryMember[]; hasMore: boolean }> {
    let query = supabase
      .from('profiles_public_view')
      .select(
        'id, full_name, position_in_association, association_id, graduation_year, contact_email, is_referent, position_color, association_name'
      )
      .order('full_name')
      .order('id')
      // Une ligne de plus que la page : sert à savoir s'il en reste, sans requête de comptage.
      .range(offset, offset + DIRECTORY_PAGE_SIZE);

    const filter = buildDirectoryFilter(search);
    if (filter) query = query.or(filter);

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data as DirectoryMember[]) || [];
    return { rows: rows.slice(0, DIRECTORY_PAGE_SIZE), hasMore: rows.length > DIRECTORY_PAGE_SIZE };
  },
};
