import { COLS, ROWS, OPPOSITE, SnakeState, createInitialState, isReversal, placeFood, speedFor, step } from '../data/snakeLogic';

const state = (overrides: Partial<SnakeState>): SnakeState => ({
  snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
  food: { x: 15, y: 15 },
  dir: 'right',
  score: 0,
  status: 'playing',
  ...overrides,
});

describe('createInitialState', () => {
  it('place un serpent de 3 cases au centre, tourné vers la droite, avec de quoi manger', () => {
    const s = createInitialState(COLS, ROWS, () => 0);
    expect(s.snake).toHaveLength(3);
    expect(s.dir).toBe('right');
    expect(s.status).toBe('playing');
    expect(s.score).toBe(0);
    expect(s.food).not.toBeNull();
    expect(s.snake.some((p) => p.x === s.food!.x && p.y === s.food!.y)).toBe(false);
  });
});

describe('placeFood', () => {
  it('ne tombe jamais sur le serpent', () => {
    const snake = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
    for (let i = 0; i < 200; i++) {
      const food = placeFood(snake, 3, 2, Math.random)!;
      expect(snake.some((p) => p.x === food.x && p.y === food.y)).toBe(false);
    }
  });

  it('renvoie null quand la grille est pleine', () => {
    const full = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
    expect(placeFood(full, 2, 2)).toBeNull();
  });
});

describe('step', () => {
  it("avance d'une case dans la direction demandée", () => {
    const next = step(state({}), 'down');
    expect(next.snake[0]).toEqual({ x: 5, y: 6 });
    expect(next.snake).toHaveLength(3);
    expect(next.dir).toBe('down');
  });

  it("ne modifie pas l'état reçu", () => {
    const before = state({});
    const copy = JSON.parse(JSON.stringify(before));
    step(before, 'up');
    expect(before).toEqual(copy);
  });

  it('ignore un demi-tour', () => {
    const next = step(state({}), 'left');
    expect(next.dir).toBe('right');
    expect(next.snake[0]).toEqual({ x: 6, y: 5 });
    expect(next.status).toBe('playing');
  });

  it('mange, grandit, marque un point et replace de la nourriture', () => {
    const next = step(state({ food: { x: 6, y: 5 } }), 'right', COLS, ROWS, () => 0);
    expect(next.snake).toHaveLength(4);
    expect(next.score).toBe(1);
    expect(next.food).not.toBeNull();
    expect(next.food).not.toEqual({ x: 6, y: 5 });
    expect(next.snake[0]).toEqual({ x: 6, y: 5 });
  });

  it.each([
    ['gauche', { snake: [{ x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }], dir: 'left' as const }, 'left' as const],
    ['droite', { snake: [{ x: COLS - 1, y: 5 }, { x: COLS - 2, y: 5 }, { x: COLS - 3, y: 5 }] }, 'right' as const],
    ['haut', { snake: [{ x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 }], dir: 'up' as const }, 'up' as const],
    ['bas', { snake: [{ x: 5, y: ROWS - 1 }, { x: 5, y: ROWS - 2 }, { x: 5, y: ROWS - 3 }], dir: 'down' as const }, 'down' as const],
  ])('perd en touchant le mur %s', (_name, overrides, dir) => {
    expect(step(state(overrides), dir).status).toBe('over');
  });

  it('perd en se mordant le corps', () => {
    // Serpent de 5 cases replié : la tête va sur une case de son propre corps.
    const coiled = state({
      snake: [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 5 }, { x: 4, y: 4 }],
      dir: 'down',
    });
    expect(step(coiled, 'left').status).toBe('over');
  });

  it('peut prendre la case que la queue libère au même moment', () => {
    // Carré de 4 cases : la tête rejoint la case de la queue, qui vient de se libérer.
    const square = state({
      snake: [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 5 }],
      dir: 'up',
    });
    const next = step(square, 'left');
    expect(next.status).toBe('playing');
    expect(next.snake[0]).toEqual({ x: 4, y: 5 });
  });

  it('gagne quand le serpent remplit la grille', () => {
    // Grille 2 × 2, serpent de 3 cases, la dernière case libre porte la nourriture.
    const almost = state({
      snake: [{ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }],
      food: { x: 1, y: 1 },
      dir: 'right',
    });
    const won = step(almost, 'down', 2, 2);
    expect(won.status).toBe('won');
    expect(won.snake).toHaveLength(4);
    expect(won.score).toBe(1);
  });

  it('ne bouge plus une fois la partie terminée', () => {
    const over = state({ status: 'over' });
    expect(step(over, 'up')).toBe(over);
  });
});

describe('isReversal', () => {
  it('détecte les 4 demi-tours', () => {
    (['up', 'down', 'left', 'right'] as const).forEach((dir) => {
      expect(isReversal(dir, OPPOSITE[dir], 3)).toBe(true);
      expect(isReversal(dir, dir, 3)).toBe(false);
    });
  });

  it("autorise le demi-tour d'un serpent d'une seule case", () => {
    expect(isReversal('up', 'down', 1)).toBe(false);
  });
});

describe('speedFor', () => {
  it('accélère avec le score sans jamais descendre sous 75 ms', () => {
    expect(speedFor(0)).toBe(150);
    expect(speedFor(10)).toBe(120);
    expect(speedFor(25)).toBe(75);
    expect(speedFor(500)).toBe(75);
  });
});

describe('parties complètes', () => {
  it('un serpent qui zigzague tout seul reste cohérent (jamais de case en double, tête dans la grille)', () => {
    let s = createInitialState();
    const turns = ['up', 'left', 'down', 'right'] as const;
    for (let i = 0; i < 3000 && s.status === 'playing'; i++) {
      s = step(s, turns[Math.floor(i / 4) % 4]);
      if (s.status !== 'playing') break;
      const keys = new Set(s.snake.map((p) => `${p.x},${p.y}`));
      expect(keys.size).toBe(s.snake.length);
      expect(s.snake.every((p) => p.x >= 0 && p.x < COLS && p.y >= 0 && p.y < ROWS)).toBe(true);
    }
  });
});
