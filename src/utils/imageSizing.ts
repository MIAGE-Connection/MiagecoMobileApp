// Taille maximale (en pixels, plus grand côté) des images d'association envoyées dans le stockage.
// Un logo s'affiche en ~64 px (jusqu'à ~200 px sur un écran très dense) : 256 px suffit largement.
// Une bannière s'affiche sur toute la largeur d'un téléphone : 1024 px suffit.
export const IMAGE_MAX_SIDE = { logo: 256, banner: 1024 } as const;

export type ImageKind = keyof typeof IMAGE_MAX_SIDE;

// Réduction à appliquer : null si l'image est déjà assez petite (on ne l'agrandit jamais),
// sinon la dimension à imposer sur le plus grand côté (l'autre suit, proportions conservées).
export function resizeTarget(kind: ImageKind, width: number, height: number): { width: number } | { height: number } | null {
  const max = IMAGE_MAX_SIDE[kind];
  if (!(width > 0) || !(height > 0)) return null;
  if (Math.max(width, height) <= max) return null;
  return width >= height ? { width: max } : { height: max };
}
