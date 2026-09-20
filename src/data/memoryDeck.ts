// Memory : grille classique 4 × 4 = 8 paires (difficulté moyenne).
export const GRID_COLUMNS = 4;
export const PAIRS_COUNT = 8;

export interface MemoryFace {
  id: string;
  // Nom de l'association (sert d'accessibilité et de repli si le logo ne charge pas).
  label: string;
  logoUrl?: string;
  emoji?: string;
}

export interface MemoryCard {
  uid: string;
  pairId: string;
  face: MemoryFace;
}

export interface LogoSource {
  id: string;
  name: string;
  logo_url: string;
}

// Complète la grille quand il n'y a pas assez de logos d'associations.
const FILLER_EMOJIS = ['🎓', '💻', '📊', '🚀', '🎯', '💡', '🏆', '🤝', '📚', '🎉', '🧠', '🔐'];

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// 8 paires : les logos d'associations d'abord (tirés au hasard, sans doublon d'image),
// puis des emojis pour combler ce qui manque.
export function buildDeck(logos: LogoSource[]): MemoryCard[] {
  const seenUrls = new Set<string>();
  const uniqueLogos = logos.filter((logo) => {
    if (!logo.logo_url || seenUrls.has(logo.logo_url)) return false;
    seenUrls.add(logo.logo_url);
    return true;
  });

  const faces: MemoryFace[] = shuffle(uniqueLogos)
    .slice(0, PAIRS_COUNT)
    .map((logo) => ({ id: `asso-${logo.id}`, label: logo.name, logoUrl: logo.logo_url }));

  const missing = PAIRS_COUNT - faces.length;
  if (missing > 0) {
    shuffle(FILLER_EMOJIS)
      .slice(0, missing)
      .forEach((emoji, index) => faces.push({ id: `emoji-${index}`, label: 'Carte', emoji }));
  }

  const cards: MemoryCard[] = faces.flatMap((face) => [
    { uid: `${face.id}-a`, pairId: face.id, face },
    { uid: `${face.id}-b`, pairId: face.id, face },
  ]);
  return shuffle(cards);
}
