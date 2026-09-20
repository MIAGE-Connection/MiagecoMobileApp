import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';
import { associationService } from './associationService';
import type { LogoSource } from '../data/memoryDeck';

const CACHE_KEY = 'memory_logos_cache_v1'; // clé conservée : le cache existant reste valable
const TTL_MS = 24 * 60 * 60 * 1000;

interface LogosCache {
  savedAt: number;
  logos: LogoSource[];
}

async function readCache(): Promise<LogosCache | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as LogosCache) : null;
  } catch {
    return null;
  }
}

// Logos des associations publiées, partagés par les jeux et gardés 24 h sur le téléphone :
// jouer ne sollicite la base qu'une fois par jour et par appareil, même si des milliers de
// personnes jouent. Réseau en échec : on réutilise le cache périmé, à défaut une liste vide
// (les jeux savent alors se passer de logos).
export const associationLogosService = {
  async loadLogos(): Promise<LogoSource[]> {
    const cached = await readCache();
    if (cached && Date.now() - cached.savedAt < TTL_MS) {
      return cached.logos;
    }
    try {
      const associations = await associationService.getAllAssociations();
      const logos = associations
        .filter((a) => !!a.logo_url)
        .map((a) => ({ id: a.id, name: a.name, logo_url: a.logo_url as string }));
      // Préchargement en tâche de fond : les images sont prêtes quand on en a besoin.
      logos.forEach((logo) => Image.prefetch(logo.logo_url).catch(() => undefined));
      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), logos }));
      } catch {
        // Le cache est une optimisation : un échec d'écriture n'empêche pas de jouer.
      }
      return logos;
    } catch (error) {
      console.error('associationLogosService: loadLogos error', error);
      return cached?.logos ?? [];
    }
  },
};
