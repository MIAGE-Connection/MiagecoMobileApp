import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PuzzleBest {
  moves: number;
  seconds: number;
}

// Un record par taille de grille : 3×3 et 4×4 ne se comparent pas.
const keyFor = (size: number) => `puzzle_best_score_${size}_v1`;

export const puzzleGameService = {
  async getBest(size: number): Promise<PuzzleBest | null> {
    try {
      const raw = await AsyncStorage.getItem(keyFor(size));
      return raw ? (JSON.parse(raw) as PuzzleBest) : null;
    } catch {
      return null;
    }
  },

  // Meilleur score = moins de coups, puis moins de secondes. Renvoie true si c'est un nouveau record.
  async saveIfBest(size: number, score: PuzzleBest): Promise<boolean> {
    const best = await this.getBest(size);
    const isBetter = !best || score.moves < best.moves || (score.moves === best.moves && score.seconds < best.seconds);
    if (!isBetter) return false;
    try {
      await AsyncStorage.setItem(keyFor(size), JSON.stringify(score));
    } catch {
      // Le record local est un confort : on ignore un échec d'écriture.
    }
    return true;
  },
};
