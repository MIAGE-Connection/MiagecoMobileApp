import { DEFAULT_END, formatEnd, maxDay, nextOccurrence, parseEnd } from '../utils/membershipEnd';

describe('parseEnd', () => {
  it('lit une valeur MM-JJ valide', () => {
    expect(parseEnd('08-31')).toEqual({ month: 8, day: 31 });
    expect(parseEnd('01-05')).toEqual({ month: 1, day: 5 });
    expect(parseEnd('12-31')).toEqual({ month: 12, day: 31 });
  });

  it.each([null, undefined, '', '8-31', '13-01', '00-10', '08-00', '08-32', 'abc', '08/31', '2026-08-31'])(
    'retombe sur le 31 août pour %p',
    (raw) => {
      expect(parseEnd(raw as string | null | undefined)).toEqual(DEFAULT_END);
    }
  );

  it("refuse un jour qui n'existe pas dans le mois (31 avril, 30 février, 29 février)", () => {
    expect(parseEnd('04-31')).toEqual(DEFAULT_END);
    expect(parseEnd('02-30')).toEqual(DEFAULT_END);
    expect(parseEnd('02-29')).toEqual(DEFAULT_END);
  });
});

describe('maxDay', () => {
  it('donne le nombre de jours de chaque mois (février = 28)', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(maxDay)).toEqual([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
  });
});

describe('nextOccurrence', () => {
  const end = { month: 8, day: 31 };

  it("reste dans l'année quand la date n'est pas passée", () => {
    expect(nextOccurrence(end, new Date(2026, 0, 15))).toEqual(new Date(2026, 7, 31));
    expect(nextOccurrence(end, new Date(2026, 7, 30))).toEqual(new Date(2026, 7, 31));
  });

  it('compte le jour même (se connecter le jour J donne une adhésion valable ce jour-là)', () => {
    expect(nextOccurrence(end, new Date(2026, 7, 31, 23, 59))).toEqual(new Date(2026, 7, 31));
  });

  it("passe à l'année suivante dès le lendemain", () => {
    expect(nextOccurrence(end, new Date(2026, 8, 1))).toEqual(new Date(2027, 7, 31));
    expect(nextOccurrence(end, new Date(2026, 11, 31))).toEqual(new Date(2027, 7, 31));
  });

  it("fonctionne pour une date de début d'année", () => {
    expect(nextOccurrence({ month: 1, day: 1 }, new Date(2026, 5, 1))).toEqual(new Date(2027, 0, 1));
  });
});

describe('formatEnd', () => {
  it('écrit la date en français', () => {
    expect(formatEnd({ month: 8, day: 31 })).toBe('31 août');
    expect(formatEnd({ month: 2, day: 1 })).toBe('1er février');
    expect(formatEnd({ month: 12, day: 25 })).toBe('25 décembre');
  });
});
