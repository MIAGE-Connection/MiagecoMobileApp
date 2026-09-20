// Filtre de recherche de l'annuaire au format PostgREST « or(...) » : nom, poste, association, promotion.
// Les caractères qui ont un sens dans ce format ou dans un motif ilike sont retirés de la saisie :
// une recherche ne peut donc jamais modifier la requête.
export function buildDirectoryFilter(search: string): string | null {
  const term = search.replace(/[,()%*_\\"'`:;]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!term) return null;
  const parts = [
    `full_name.ilike.*${term}*`,
    `position_in_association.ilike.*${term}*`,
    `association_name.ilike.*${term}*`,
  ];
  if (/^\d{4}$/.test(term)) parts.push(`graduation_year.eq.${term}`);
  return parts.join(',');
}
