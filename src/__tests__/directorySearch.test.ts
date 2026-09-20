import { buildDirectoryFilter } from '../utils/directorySearch';

describe('buildDirectoryFilter', () => {
  it('ne filtre rien pour une saisie vide ou faite de caractères ignorés', () => {
    expect(buildDirectoryFilter('')).toBeNull();
    expect(buildDirectoryFilter('   ')).toBeNull();
    expect(buildDirectoryFilter('%%(),')).toBeNull();
  });

  it('cherche le terme dans le nom, le poste et l’association', () => {
    expect(buildDirectoryFilter('lyon')).toBe(
      'full_name.ilike.*lyon*,position_in_association.ilike.*lyon*,association_name.ilike.*lyon*'
    );
  });

  it('garde les espaces et les accents', () => {
    expect(buildDirectoryFilter('  Léa   Martin ')).toContain('full_name.ilike.*Léa Martin*');
  });

  it('ajoute la promotion quand la saisie est une année', () => {
    expect(buildDirectoryFilter('2027')).toContain(',graduation_year.eq.2027');
    expect(buildDirectoryFilter('202')).not.toContain('graduation_year');
    expect(buildDirectoryFilter('20277')).not.toContain('graduation_year');
  });

  it("ne laisse jamais une saisie ajouter ou casser un filtre", () => {
    const filter = buildDirectoryFilter('a),full_name.eq.x,(b*%_"\\')!;
    // Trois filtres seulement, séparés par des virgules : rien de la saisie ne peut en créer un quatrième.
    expect(filter.split(',')).toHaveLength(3);
    expect(filter).not.toMatch(/[()"%\\]/);
  });
});
