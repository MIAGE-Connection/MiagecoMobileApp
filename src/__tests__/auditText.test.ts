import { AuditEntry, describeEntry } from '../utils/auditText';

const entry = (overrides: Partial<AuditEntry>): AuditEntry => ({
  id: '1',
  created_at: '2026-09-20T10:00:00Z',
  actor_label: 'Rayan',
  action: 'member_suspended',
  target_label: 'Léa Martin',
  details: {},
  ...overrides,
});

describe('describeEntry', () => {
  it('décrit une suspension et une réactivation', () => {
    expect(describeEntry(entry({}))).toBe('Rayan a suspendu Léa Martin.');
    expect(describeEntry(entry({ action: 'member_reactivated' }))).toBe('Rayan a réactivé Léa Martin.');
  });

  it("nomme l'association d'un référent", () => {
    expect(describeEntry(entry({ action: 'referent_appointed', details: { association: 'MIAGE Lyon' } }))).toBe(
      'Rayan a nommé Léa Martin référent de MIAGE Lyon.'
    );
    expect(describeEntry(entry({ action: 'referent_removed', details: { association: 'MIAGE Lyon' } }))).toBe(
      'Rayan a retiré le rôle de référent à Léa Martin (MIAGE Lyon).'
    );
  });

  it('traduit un changement de rôle', () => {
    expect(describeEntry(entry({ action: 'role_changed', details: { from: 'member', to: 'admin_national' } }))).toBe(
      'Rayan a changé le rôle de Léa Martin : adhérent → super admin.'
    );
  });

  it("indique une action faite hors de l'application quand il n'y a pas d'auteur", () => {
    expect(describeEntry(entry({ actor_label: null }))).toBe('Supabase (hors application) a suspendu Léa Martin.');
  });

  it('anonymise une cible dont le compte a été supprimé', () => {
    expect(describeEntry(entry({ target_label: null }))).toBe('Rayan a suspendu un compte supprimé.');
  });

  it("écrit la fin d'adhésion en français", () => {
    expect(describeEntry(entry({ action: 'membership_end_changed', details: { from: '08-31', to: '07-15' } }))).toBe(
      "Rayan a changé la fin d'adhésion : 31 août → 15 juillet."
    );
    expect(describeEntry(entry({ action: 'membership_end_changed', details: { to: '01-01' } }))).toBe(
      "Rayan a changé la fin d'adhésion : aucune → 1er janvier."
    );
  });

  it('accorde le pluriel du nombre de comptes ou d’adhérents', () => {
    expect(describeEntry(entry({ action: 'membership_end_applied', details: { count: 1 } }))).toBe(
      "Rayan a appliqué la fin d'adhésion à 1 adhérent actif."
    );
    expect(describeEntry(entry({ action: 'membership_end_applied', details: { count: 42 } }))).toBe(
      "Rayan a appliqué la fin d'adhésion à 42 adhérents actifs."
    );
    expect(describeEntry(entry({ action: 'account_purge', actor_label: null, details: { count: 3 } }))).toBe(
      'Suppression automatique de 3 comptes (adhésion terminée depuis plus de 3 ans).'
    );
  });
});
