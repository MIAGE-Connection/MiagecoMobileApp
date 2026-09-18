import { supabase } from './supabase';

// Tables de contenu éditables par le super admin (RLS : admin_full_access).
export type ContentTable = 'events' | 'admin_news' | 'featured_events' | 'member_documents';

export type ContentRow = Record<string, any> & { id: string };

export const contentAdminService = {
  // `scope` restreint la liste à une association (référent : ses propres contenus).
  async list(
    table: ContentTable,
    orderColumn: string,
    ascending: boolean,
    scope?: { column: string; value: string }
  ): Promise<ContentRow[]> {
    let query = supabase.from(table).select('*');
    if (scope) query = query.eq(scope.column, scope.value);
    const { data, error } = await query.order(orderColumn, { ascending });
    if (error) throw error;
    return (data as ContentRow[]) || [];
  },

  async save(table: ContentTable, id: string | null, values: Record<string, unknown>): Promise<string> {
    if (id) {
      const { error } = await supabase.from(table).update(values).eq('id', id);
      if (error) throw error;
      return id;
    }
    const { data, error } = await supabase.from(table).insert(values).select('id').single();
    if (error) throw error;
    return data.id;
  },

  async setPublished(table: ContentTable, id: string, isPublished: boolean): Promise<void> {
    const { error } = await supabase.from(table).update({ is_published: isPublished }).eq('id', id);
    if (error) throw error;
  },

  // Une seule ligne publiée à la fois (l'accueil n'affiche qu'un événement à la une).
  async unpublishOthers(table: ContentTable, keepId: string): Promise<void> {
    const { error } = await supabase.from(table).update({ is_published: false }).neq('id', keepId);
    if (error) throw error;
  },

  async remove(table: ContentTable, id: string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  },
};
