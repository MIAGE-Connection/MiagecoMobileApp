// Snake : règles du jeu, sans aucune dépendance à React (pour rester testable et sans effet de bord).
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Point {
  x: number;
  y: number;
}

export type SnakeStatus = 'playing' | 'over' | 'won';

export interface SnakeState {
  // Tête en premier.
  snake: Point[];
  food: Point | null;
  dir: Direction;
  score: number;
  status: SnakeStatus;
}

// Grille plus fine : le mouvement est animé en continu, donc plus de cases = plus de précision de virage.
export const COLS = 17;
export const ROWS = 20;

const DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

// Case libre tirée au hasard ; null quand le serpent remplit toute la grille.
export function placeFood(snake: Point[], cols: number, rows: number, rng: () => number = Math.random): Point | null {
  const taken = new Set(snake.map((p) => `${p.x},${p.y}`));
  const free: Point[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(rng() * free.length)];
}

// Serpent de 3 cases au centre, tourné vers la droite.
export function createInitialState(cols: number = COLS, rows: number = ROWS, rng: () => number = Math.random): SnakeState {
  const hx = Math.min(Math.floor(cols / 2), cols - 1);
  const hy = Math.floor(rows / 2);
  const snake: Point[] = [
    { x: hx, y: hy },
    { x: hx - 1, y: hy },
    { x: hx - 2, y: hy },
  ].filter((p) => p.x >= 0);
  return { snake, food: placeFood(snake, cols, rows, rng), dir: 'right', score: 0, status: 'playing' };
}

// Un demi-tour à 180° est impossible (le serpent se mordrait immédiatement).
export function isReversal(current: Direction, requested: Direction, length: number): boolean {
  return length > 1 && OPPOSITE[current] === requested;
}

// Avance d'une case. Ne modifie jamais l'état reçu.
export function step(
  state: SnakeState,
  requested: Direction,
  cols: number = COLS,
  rows: number = ROWS,
  rng: () => number = Math.random
): SnakeState {
  if (state.status !== 'playing') return state;

  const dir = isReversal(state.dir, requested, state.snake.length) ? state.dir : requested;
  const head = state.snake[0];
  const next: Point = { x: head.x + DELTA[dir].x, y: head.y + DELTA[dir].y };

  if (next.x < 0 || next.x >= cols || next.y < 0 || next.y >= rows) {
    return { ...state, dir, status: 'over' };
  }

  const eats = !!state.food && next.x === state.food.x && next.y === state.food.y;
  // Sans repas, la queue libère sa case au même moment : la tête peut donc la prendre.
  const body = eats ? state.snake : state.snake.slice(0, -1);
  if (body.some((p) => p.x === next.x && p.y === next.y)) {
    return { ...state, dir, status: 'over' };
  }

  const snake = [next, ...(eats ? state.snake : state.snake.slice(0, -1))];
  if (!eats) return { ...state, snake, dir };

  const food = placeFood(snake, cols, rows, rng);
  return { snake, food, dir, score: state.score + 1, status: food ? 'playing' : 'won' };
}

// Durée d'une case en ms : plus on mange, plus ça accélère (plancher pour rester jouable).
export function speedFor(score: number): number {
  return Math.max(75, 150 - score * 3);
}
