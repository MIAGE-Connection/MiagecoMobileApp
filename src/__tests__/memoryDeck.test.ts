import { PAIRS_COUNT, buildDeck, shuffle } from '../data/memoryDeck';

const logos = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `a${i}`, name: `Asso ${i}`, logo_url: `https://exemple.fr/${i}.png` }));

const countByPair = (deck: ReturnType<typeof buildDeck>) => {
  const counts: Record<string, number> = {};
  deck.forEach((card) => (counts[card.pairId] = (counts[card.pairId] || 0) + 1));
  return counts;
};

describe('buildDeck', () => {
  it.each([0, 3, 8, 20])('donne 16 cartes formant 8 paires exactes avec %p logos', (count) => {
    const deck = buildDeck(logos(count));
    expect(deck).toHaveLength(PAIRS_COUNT * 2);
    const counts = countByPair(deck);
    expect(Object.keys(counts)).toHaveLength(PAIRS_COUNT);
    expect(Object.values(counts).every((n) => n === 2)).toBe(true);
    expect(new Set(deck.map((c) => c.uid)).size).toBe(deck.length);
  });

  it('comble avec des emojis quand il manque des logos', () => {
    const deck = buildDeck(logos(5));
    expect(deck.filter((c) => c.face.logoUrl)).toHaveLength(10);
    expect(deck.filter((c) => c.face.emoji)).toHaveLength(6);
  });

  it("n'utilise que des logos quand il y en a assez", () => {
    const deck = buildDeck(logos(12));
    expect(deck.every((c) => c.face.logoUrl && !c.face.emoji)).toBe(true);
  });

  it("ignore les doublons d'image et les logos sans adresse", () => {
    const dup = [
      { id: '1', name: 'A', logo_url: 'https://x/1.png' },
      { id: '2', name: 'B', logo_url: 'https://x/1.png' },
      { id: '3', name: 'C', logo_url: '' },
    ];
    const deck = buildDeck(dup);
    expect(deck.filter((c) => c.face.logoUrl)).toHaveLength(2);
  });
});

describe('shuffle', () => {
  it("garde les mêmes éléments sans modifier l'original", () => {
    const original = [1, 2, 3, 4, 5];
    const result = shuffle(original);
    expect(original).toEqual([1, 2, 3, 4, 5]);
    expect([...result].sort()).toEqual(original);
  });
});
