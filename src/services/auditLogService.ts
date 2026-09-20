import { supabase } from './supabase';
import { AuditEntry } from '../utils/auditText';

export type { AuditEntry } from '../utils/auditText';
export { describeEntry } from '../utils/auditText';

const PAGE_SIZE = 50;

export const auditLogService = {
  // Page suivante du journal, du plus récent au plus ancien (lecture réservée au super admin par la RLS).
  async getPage(offset: number): Promise<{ rows: AuditEntry[]; hasMore: boolean }> {
    // Une ligne de plus que la page : sert à savoir s'il en reste, sans requête de comptage.
    const { data, error } = await supabase
      .from('admin_audit_log')
      .select('id, created_at, actor_label, action, target_label, details')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + PAGE_SIZE);

    if (error) {
      // 42P01 / PGRST205 : table absente -> le script SQL de la phase 18 n'est pas installé.
      if (error.code === '42P01' || error.code === 'PGRST205') {
        throw new Error("Le journal est absent de Supabase : lance le script SQL de la phase 18.");
      }
      throw error;
    }
    const rows = (data as AuditEntry[]) || [];
    return { rows: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
  },
};
