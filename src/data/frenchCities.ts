// Liste prédéfinie de villes pour les événements : grandes villes, préfectures,
// villes universitaires MIAGE et communes d'Île-de-France courantes, outre-mer inclus.
// Pour en ajouter une, il suffit de l'ajouter ici (l'ordre est trié automatiquement).
const CITIES = [
  'Agen', 'Aix-en-Provence', 'Ajaccio', 'Albi', 'Amiens', 'Angers', 'Angoulême', 'Annecy', 'Antibes',
  'Argenteuil', 'Arles', 'Arras', 'Asnières-sur-Seine', 'Aubervilliers', 'Aulnay-sous-Bois', 'Auxerre',
  'Avignon', 'Bayonne', 'Beauvais', 'Belfort', 'Besançon', 'Béthune', 'Béziers', 'Blois', 'Bobigny',
  'Bordeaux', 'Boulogne-Billancourt', 'Bourg-en-Bresse', 'Bourges', 'Brest', 'Brive-la-Gaillarde', 'Cachan',
  'Caen', 'Calais', 'Cambrai', 'Cannes', 'Cayenne', 'Cergy', 'Chambéry', 'Champs-sur-Marne', 'Chartres',
  'Châteauroux', 'Cholet', 'Clermont-Ferrand', 'Colmar', 'Colombes', 'Compiègne', 'Courbevoie', 'Créteil',
  'Dijon', 'Douai', 'Dunkerque', 'Épinal', 'Évreux', 'Évry-Courcouronnes', 'Fontainebleau', 'Fort-de-France',
  'Gif-sur-Yvette', 'Grenoble', 'Guyancourt', 'Haguenau', 'Issy-les-Moulineaux', 'La Défense (Puteaux)',
  'La Rochelle', 'La Roche-sur-Yon', 'Lannion', 'Laval', 'Le Havre', 'Le Mans', 'Lens', 'Levallois-Perret',
  'Lille', 'Limoges', 'Lorient', 'Lyon', 'Maubeuge', 'Marseille', 'Massy', 'Meaux', 'Melun', 'Mérignac',
  'Metz', 'Montauban', 'Mont-de-Marsan', 'Montélimar', 'Montpellier', 'Montreuil', 'Mulhouse', 'Nancy',
  'Nanterre', 'Nantes', 'Neuilly-sur-Seine', 'Nevers', 'Nice', 'Nîmes', 'Niort', 'Noisy-le-Grand', 'Nouméa',
  'Orléans', 'Orsay', 'Palaiseau', 'Papeete', 'Paris', 'Pau', 'Périgueux', 'Perpignan', 'Pessac',
  'Pointe-à-Pitre', 'Poitiers', 'Puteaux', 'Quimper', 'Reims', 'Rennes', 'Roubaix', 'Rouen', 'Rueil-Malmaison',
  'Saclay', 'Saint-Brieuc', 'Saint-Denis (93)', 'Saint-Denis (La Réunion)', 'Saint-Étienne',
  'Saint-Germain-en-Laye', 'Saint-Malo', 'Saint-Martin-d’Hères', 'Saint-Nazaire', 'Saint-Ouen',
  'Saint-Quentin', 'Sceaux', 'Sophia Antipolis', 'Strasbourg', 'Talence', 'Tarbes', 'Thionville', 'Toulon',
  'Toulouse', 'Tourcoing', 'Tours', 'Troyes', 'Valence', 'Valenciennes', 'Vandœuvre-lès-Nancy', 'Vannes',
  'Vélizy-Villacoublay', 'Versailles', 'Villejuif', 'Villetaneuse', 'Villeneuve-d’Ascq', 'Villeurbanne',
  'Vitry-sur-Seine',
];

export const ONLINE_LABEL = 'En ligne';

// « En ligne » d'abord (événements en visio), puis les villes par ordre alphabétique.
export const FRENCH_CITIES: string[] = [
  ONLINE_LABEL,
  ...Array.from(new Set(CITIES)).sort((a, b) => a.localeCompare(b, 'fr')),
];

// Compare sans tenir compte des accents ni de la casse (« saint etienne » trouve « Saint-Étienne »).
export const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'-]/g, ' ')
    .toLowerCase()
    .trim();
