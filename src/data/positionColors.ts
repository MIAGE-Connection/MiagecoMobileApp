// Couleurs proposées pour les badges de postes. Toutes assez foncées pour un texte blanc lisible.
// Le serveur impose une couleur différente par poste (index unique) : une couleur déjà prise est grisée.
export const POSITION_COLORS: { hex: string; name: string }[] = [
  { hex: '#C62828', name: 'Rouge' },
  { hex: '#AD1457', name: 'Rose' },
  { hex: '#6A1B9A', name: 'Violet' },
  { hex: '#4527A0', name: 'Indigo' },
  { hex: '#1565C0', name: 'Bleu' },
  { hex: '#0E7490', name: 'Cyan' },
  { hex: '#00695C', name: 'Turquoise' },
  { hex: '#2E7D32', name: 'Vert' },
  { hex: '#B45309', name: 'Ambre' },
  { hex: '#C2410C', name: 'Orange' },
  { hex: '#5D4037', name: 'Marron' },
  { hex: '#455A64', name: 'Ardoise' },
];

// Badge des postes saisis librement avant la mise en place de la liste
export const LEGACY_POSITION_COLOR = '#6B7280';
