// Taquin : règles pures, sans dépendance à React.
// Une grille est un tableau de n*n valeurs : 1..n*n-1 pour les tuiles, 0 pour la case vide.
// État résolu : [1, 2, ..., n*n-1, 0].
export type Grid = number[];

export const SIZES = [3, 4] as const;
export type PuzzleSize = (typeof SIZES)[number];

export function createSolved(n: number): Grid {
  const grid = Array.from({ length: n * n - 1 }, (_, i) => i + 1);
  grid.push(0);
  return grid;
}

export function isSolved(grid: Grid): boolean {
  return grid.every((value, i) => (i === grid.length - 1 ? value === 0 : value === i + 1));
}

const rowOf = (index: number, n: number) => Math.floor(index / n);
const colOf = (index: number, n: number) => index % n;

// Tuiles voisines de la case vide (pour le mélange).
function blankNeighbours(grid: Grid, n: number): number[] {
  const blank = grid.indexOf(0);
  const r = rowOf(blank, n);
  const c = colOf(blank, n);
  const result: number[] = [];
  if (r > 0) result.push(blank - n);
  if (r < n - 1) result.push(blank + n);
  if (c > 0) result.push(blank - 1);
  if (c < n - 1) result.push(blank + 1);
  return result;
}

// Toucher une tuile alignée avec la case vide fait glisser toute la file d'un coup.
// Renvoie la nouvelle grille et le nombre de tuiles déplacées (0 si la tuile est bloquée).
export function slide(grid: Grid, n: number, index: number): { grid: Grid; moved: number } {
  const blank = grid.indexOf(0);
  if (index === blank) return { grid, moved: 0 };

  const sameRow = rowOf(index, n) === rowOf(blank, n);
  const sameCol = colOf(index, n) === colOf(blank, n);
  if (!sameRow && !sameCol) return { grid, moved: 0 };

  const step = sameRow ? (index < blank ? 1 : -1) : index < blank ? n : -n;
  const next = [...grid];
  let moved = 0;
  // On remonte depuis la case vide vers la tuile touchée, en décalant chaque tuile d'une case.
  for (let cursor = blank; cursor !== index; cursor -= step) {
    next[cursor] = next[cursor - step];
    moved++;
  }
  next[index] = 0;
  return { grid: next, moved };
}

// Mélange en jouant des coups légaux depuis l'état résolu : la grille obtenue est TOUJOURS résoluble
// (un simple tirage au hasard des tuiles l'est une fois sur deux seulement).
export function shuffled(n: number, rng: () => number = Math.random): Grid {
  const minMisplaced = Math.ceil(n * n * 0.7);
  const moves = n * n * 30;
  for (let attempt = 0; attempt < 20; attempt++) {
    let grid = createSolved(n);
    let previousBlank = -1;
    for (let i = 0; i < moves; i++) {
      const blank = grid.indexOf(0);
      // Interdit de défaire le coup précédent : sinon le mélange tourne en rond.
      const options = blankNeighbours(grid, n).filter((index) => index !== previousBlank);
      const pick = options[Math.floor(rng() * options.length)];
      previousBlank = blank;
      grid = slide(grid, n, pick).grid;
    }
    const misplaced = grid.filter((value, i) => value !== 0 && value !== i + 1).length;
    if (!isSolved(grid) && misplaced >= minMisplaced) return grid;
  }
  // Repli quasi impossible : un simple coup depuis l'état résolu, jamais déjà gagné.
  return slide(createSolved(n), n, n * n - 2).grid;
}

// Vérifie qu'une grille est résoluble (sert aux tests).
export function isSolvable(grid: Grid, n: number): boolean {
  const tiles = grid.filter((v) => v !== 0);
  let inversions = 0;
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) if (tiles[i] > tiles[j]) inversions++;
  }
  if (n % 2 === 1) return inversions % 2 === 0;
  const blankRowFromBottom = n - rowOf(grid.indexOf(0), n);
  return (inversions + blankRowFromBottom) % 2 === 1;
}
