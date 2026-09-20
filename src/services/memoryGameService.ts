import AsyncStorage from '@react-native-async-storage/async-storage';

const BEST_KEY = 'memory_best_score_v1';

export interface MemoryBest {
  moves: number;
  seconds: number;
}

export const memoryGameService = {
  async getBest(): Promise<MemoryBest | null> {
    try {
      const raw = await AsyncStorage.getItem(BEST_KEY);
      return raw ? (JSON.parse(raw) as MemoryBest) : null;
    } catch {
      return null;
    }
  },

  // Meilleur score = moins de coups, puis moins de secondes. Renvoie true si c'est un nouveau record.
  async saveIfBest(score: MemoryBest): Promise<boolean> {
    const best = await this.getBest();
    const isBetter = !best || score.moves < best.moves || (score.moves === best.moves && score.seconds < best.seconds);
    if (!isBetter) return false;
    try {
      await AsyncStorage.setItem(BEST_KEY, JSON.stringify(score));
    } catch {
      // Le record local est un confort : on ignore un échec d'écriture.
    }
    return true;
  },
};
