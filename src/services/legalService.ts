import { supabase } from './supabase';

export type LegalDocumentKey = 'cgu' | 'confidentialite' | 'mentions_legales';

export interface LegalDocument {
  key: LegalDocumentKey;
  version: string;
  title: string;
  content: string;
  updated_at: string;
}

export const legalService = {
  async getDocument(key: LegalDocumentKey): Promise<LegalDocument | null> {
    const { data, error } = await supabase
      .from('legal_documents')
      .select('*')
      .eq('key', key)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Vrai si le profil n'a pas accepté la version courante des CGU.
  async needsCguAcceptance(): Promise<boolean> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const [{ data: cgu }, { data: profile }] = await Promise.all([
      supabase.from('legal_documents').select('version').eq('key', 'cgu').maybeSingle(),
      supabase.from('profiles').select('cgu_accepted_version').eq('id', session.user.id).maybeSingle(),
    ]);

    if (!cgu?.version) return false;
    return profile?.cgu_accepted_version !== cgu.version;
  },

  async acceptCgu(): Promise<void> {
    const { error } = await supabase.rpc('accept_cgu');
    if (error) throw error;
  },

  async exportMyData(): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.rpc('export_my_data');
    if (error) throw error;
    return data;
  },

  async requestAccountDeletion(userId: string): Promise<void> {
    const { error } = await supabase.from('account_deletion_requests').insert({ user_id: userId });
    if (error) throw error;
  },
};
