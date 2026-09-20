import AsyncStorage from '@react-native-async-storage/async-storage';

const BEST_KEY = 'snake_best_score_v1';

export const snakeGameService = {
  async getBest(): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem(BEST_KEY);
      const value = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(value) ? value : 0;
    } catch {
      return 0;
    }
  },

  // Renvoie true si le score bat le record enregistré sur ce téléphone.
  async saveIfBest(score: number): Promise<boolean> {
    if (score <= 0) return false;
    const best = await this.getBest();
    if (score <= best) return false;
    try {
      await AsyncStorage.setItem(BEST_KEY, String(score));
    } catch {
      // Le record local est un confort : on ignore un échec d'écriture.
    }
    return true;
  },
};
