// Fin d'adhésion : un jour + un mois répétés chaque année (par défaut le 31 août).
// Ces règles reproduisent exactement celles du serveur (membership_end_date, phase 15)
// pour que l'aperçu affiché au super admin soit identique à ce qui sera enregistré.
export interface EndDate {
  month: number; // 1..12
  day: number; // 1..31
}

export const DEFAULT_END: EndDate = { month: 8, day: 31 };

export const MONTH_NAMES = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

// Le 29 février est exclu (pas de cas particulier d'année bissextile).
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const maxDay = (month: number): number => DAYS_IN_MONTH[month - 1];

// Lit la valeur stockée « MM-JJ » ; toute valeur invalide retombe sur le 31 août.
export function parseEnd(raw: string | null | undefined): EndDate {
  const match = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.exec(raw ?? '');
  if (!match) return DEFAULT_END;
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  if (day > maxDay(month)) return DEFAULT_END;
  return { month, day };
}

// Prochaine occurrence à partir d'aujourd'hui, aujourd'hui compris.
export function nextOccurrence(end: EndDate, from: Date = new Date()): Date {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const candidate = new Date(today.getFullYear(), end.month - 1, end.day);
  return candidate < today ? new Date(today.getFullYear() + 1, end.month - 1, end.day) : candidate;
}

export const formatEnd = (end: EndDate): string => `${end.day}${end.day === 1 ? 'er' : ''} ${MONTH_NAMES[end.month - 1]}`;

export const formatDate = (date: Date): string =>
  date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
