import { IMAGE_MAX_SIDE, resizeTarget } from '../utils/imageSizing';

describe('resizeTarget', () => {
  it('réduit un logo trop grand sur son plus grand côté', () => {
    expect(resizeTarget('logo', 1200, 1200)).toEqual({ width: IMAGE_MAX_SIDE.logo });
    expect(resizeTarget('logo', 3000, 1000)).toEqual({ width: 256 });
    expect(resizeTarget('logo', 1000, 3000)).toEqual({ height: 256 });
  });

  it("n'agrandit jamais une image déjà petite", () => {
    expect(resizeTarget('logo', 256, 256)).toBeNull();
    expect(resizeTarget('logo', 120, 80)).toBeNull();
    expect(resizeTarget('banner', 1024, 500)).toBeNull();
  });

  it('a une limite plus large pour une bannière', () => {
    expect(resizeTarget('banner', 4000, 2000)).toEqual({ width: 1024 });
    expect(resizeTarget('banner', 1024, 1025)).toEqual({ height: 1024 });
  });

  it('ignore des dimensions invalides', () => {
    expect(resizeTarget('logo', 0, 500)).toBeNull();
    expect(resizeTarget('logo', NaN, 500)).toBeNull();
  });
});
