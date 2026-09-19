import React, { useEffect, useState } from 'react';
import { Image, StyleProp, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  uri: string;
  style?: StyleProp<ViewStyle>;
  // Bornes du rapport largeur/hauteur : évite une image trop haute ou trop plate
  // (mêmes limites qu'Instagram : de 4:5 en portrait à 1,91:1 en paysage).
  minRatio?: number;
  maxRatio?: number;
}

// Affiche l'image en entier dans un cadre à sa proportion réelle, sans la déformer.
export const AutoImage: React.FC<Props> = ({ uri, style, minRatio = 0.8, maxRatio = 1.91 }) => {
  const [ratio, setRatio] = useState(1);

  useEffect(() => {
    let cancelled = false;
    Image.getSize(
      uri,
      (width, height) => {
        if (!cancelled && width > 0 && height > 0) setRatio(width / height);
      },
      () => {}
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const clamped = Math.min(Math.max(ratio, minRatio), maxRatio);

  return (
    <View style={[{ width: '100%', aspectRatio: clamped, backgroundColor: colors.border, overflow: 'hidden' }, style]}>
      {/* `contain` si l'image dépasse les bornes : on la voit entière, avec des bandes sur les côtés. */}
      <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode={ratio === clamped ? 'cover' : 'contain'} />
    </View>
  );
};
