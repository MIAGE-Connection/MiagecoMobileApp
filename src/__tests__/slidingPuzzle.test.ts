import { createSolved, isSolvable, isSolved, shuffled, slide } from '../data/slidingPuzzle';

// Générateur pseudo-aléatoire déterministe (mulberry32) pour des tests reproductibles.
const seeded = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const sorted = (grid: number[]) => [...grid].sort((a, b) => a - b);

describe('createSolved / isSolved', () => {
  it('construit la grille résolue avec la case vide en dernier', () => {
    expect(createSolved(3)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
    expect(isSolved(createSolved(3))).toBe(true);
    expect(isSolved(createSolved(4))).toBe(true);
  });

  it('reconnaît une grille non résolue', () => {
    expect(isSolved([1, 2, 3, 4, 5, 6, 7, 0, 8])).toBe(false);
  });
});

describe('slide', () => {
  it('déplace une tuile voisine de la case vide', () => {
    const { grid, moved } = slide(createSolved(3), 3, 7); // tuile 8, à gauche de la case vide
    expect(moved).toBe(1);
    expect(grid).toEqual([1, 2, 3, 4, 5, 6, 7, 0, 8]);
  });

  it('fait glisser toute la file quand la tuile touchée est alignée avec la case vide', () => {
    const { grid, moved } = slide(createSolved(3), 3, 6); // tuile 7, deux cases avant la case vide
    expect(moved).toBe(2);
    expect(grid).toEqual([1, 2, 3, 4, 5, 6, 0, 7, 8]);
  });

  it('fonctionne aussi en colonne', () => {
    const { grid, moved } = slide(createSolved(3), 3, 2); // tuile 3, dans la colonne de la case vide
    expect(moved).toBe(2);
    expect(grid).toEqual([1, 2, 0, 4, 5, 3, 7, 8, 6]);
  });

  it("ne bouge pas une tuile qui n'est pas alignée", () => {
    const start = createSolved(3);
    const { grid, moved } = slide(start, 3, 0);
    expect(moved).toBe(0);
    expect(grid).toBe(start);
  });

  it('ne fait rien quand on touche la case vide', () => {
    const start = createSolved(3);
    expect(slide(start, 3, 8)).toEqual({ grid: start, moved: 0 });
  });

  it("ne modifie jamais la grille d'origine", () => {
    const start = createSolved(4);
    const copy = [...start];
    slide(start, 4, 11);
    expect(start).toEqual(copy);
  });

  it('ne perd ni ne duplique aucune tuile', () => {
    const rng = seeded(7);
    let grid = createSolved(4);
    for (let i = 0; i < 500; i++) {
      grid = slide(grid, 4, Math.floor(rng() * 16)).grid;
      expect(sorted(grid)).toEqual(sorted(createSolved(4)));
    }
  });

  it('un coup se défait en touchant la tuile qui vient de bouger', () => {
    const start = createSolved(3);
    const once = slide(start, 3, 7).grid;
    const back = slide(once, 3, 8).grid;
    expect(back).toEqual(start);
  });
});

describe('shuffled', () => {
  it.each([3, 4])('donne toujours une grille résoluble, mélangée et complète (taille %p)', (n) => {
    for (let seed = 1; seed <= 150; seed++) {
      const grid = shuffled(n, seeded(seed));
      expect(isSolved(grid)).toBe(false);
      expect(isSolvable(grid, n)).toBe(true);
      expect(sorted(grid)).toEqual(sorted(createSolved(n)));
    }
  });

  it('mélange vraiment : la plupart des tuiles changent de place', () => {
    const grid = shuffled(4, seeded(42));
    const misplaced = grid.filter((value, i) => value !== 0 && value !== i + 1).length;
    expect(misplaced).toBeGreaterThanOrEqual(Math.ceil(16 * 0.7));
  });
});

describe('isSolvable', () => {
  it('rejette une grille où seules deux tuiles sont échangées', () => {
    expect(isSolvable([1, 2, 3, 4, 5, 6, 8, 7, 0], 3)).toBe(false);
    expect(isSolvable([2, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0], 4)).toBe(false);
  });

  it('accepte la grille résolue', () => {
    expect(isSolvable(createSolved(3), 3)).toBe(true);
    expect(isSolvable(createSolved(4), 4)).toBe(true);
  });
});
