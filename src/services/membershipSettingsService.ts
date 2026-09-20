import { supabase } from './supabase';
import { EndDate, parseEnd } from '../utils/membershipEnd';

const localIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const membershipSettingsService = {
  // Réglage actuel ; absent ou invalide = 31 août (comportement historique).
  async getEnd(): Promise<EndDate> {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'membership_end')
      .maybeSingle();
    if (error) throw error;
    return parseEnd(data?.value);
  },

  // Adhérents dont l'accès est ouvert aujourd'hui (concernés par « appliquer maintenant »).
  async countActiveMembers(): Promise<number> {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_suspended', false)
      .neq('role', 'admin_national') // le super admin n'expire jamais : il n'est pas concerné
      .gte('valid_until', localIsoDate(new Date()));
    if (error) throw error;
    return count ?? 0;
  },

  // Enregistre le réglage ; renvoie le nombre d'adhérents dont la date a été modifiée.
  async save(end: EndDate, applyToActive: boolean): Promise<number> {
    const { data, error } = await supabase.rpc('set_membership_end', {
      p_month: end.month,
      p_day: end.day,
      p_apply_to_active: applyToActive,
    });
    if (error) throw error;
    return Number(data ?? 0);
  },
};
