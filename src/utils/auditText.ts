import { formatEnd, parseEnd } from './membershipEnd';

// Lignes du journal des actions sensibles et leur formulation en français (logique pure, testée).
export interface AuditEntry {
  id: string;
  created_at: string;
  actor_label: string | null;
  action:
    | 'member_suspended'
    | 'member_reactivated'
    | 'referent_appointed'
    | 'referent_removed'
    | 'role_changed'
    | 'membership_end_changed'
    | 'membership_end_applied'
    | 'membership_ended_all'
    | 'account_purge';
  target_label: string | null;
  details: Record<string, any>;
}

const ROLE_LABELS: Record<string, string> = {
  member: 'adhérent',
  admin_association: "admin de l'asso",
  admin_national: 'super admin',
};

const endLabel = (raw: unknown): string => (raw ? formatEnd(parseEnd(String(raw))) : 'aucune');

// Phrase lisible pour une ligne du journal.
export function describeEntry(entry: AuditEntry): string {
  const actor = entry.actor_label || 'Supabase (hors application)';
  const target = entry.target_label || 'un compte supprimé';
  const d = entry.details || {};

  switch (entry.action) {
    case 'member_suspended':
      return `${actor} a suspendu ${target}.`;
    case 'member_reactivated':
      return `${actor} a réactivé ${target}.`;
    case 'referent_appointed':
      return `${actor} a nommé ${target} admin de l'asso${d.association ? ` (${d.association})` : ''}.`;
    case 'referent_removed':
      return `${actor} a retiré le rôle d'admin de l'asso à ${target}${d.association ? ` (${d.association})` : ''}.`;
    case 'role_changed':
      return `${actor} a changé le rôle de ${target} : ${ROLE_LABELS[d.from] ?? d.from} → ${ROLE_LABELS[d.to] ?? d.to}.`;
    case 'membership_end_changed':
      return `${actor} a changé la fin d'adhésion : ${endLabel(d.from)} → ${endLabel(d.to)}.`;
    case 'membership_end_applied': {
      const count = Number(d.count ?? 0);
      return `${actor} a appliqué la fin d'adhésion à ${count} adhérent${count > 1 ? 's' : ''} actif${count > 1 ? 's' : ''}.`;
    }
    case 'membership_ended_all': {
      const count = Number(d.count ?? 0);
      return `${actor} a mis fin à l'adhésion de ${count} adhérent${count > 1 ? 's' : ''}.`;
    }
    case 'account_purge': {
      const count = Number(d.count ?? 0);
      return `Suppression automatique de ${count} compte${count > 1 ? 's' : ''} (adhésion terminée depuis plus de 3 ans).`;
    }
    default:
      return `${actor} : action « ${entry.action} ».`;
  }
}
