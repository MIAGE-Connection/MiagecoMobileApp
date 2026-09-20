import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { LEGACY_POSITION_COLOR } from '../data/positionColors';

interface Props {
  label: string;
  // Couleur du poste ; absente = ancien texte libre, badge gris.
  color?: string | null;
  style?: ViewStyle;
}

// Badge de poste : pastille pleine de la couleur du poste, texte blanc.
export const PositionBadge: React.FC<Props> = ({ label, color, style }) => (
  <View style={[styles.badge, { backgroundColor: color || LEGACY_POSITION_COLOR }, style]}>
    <Text style={styles.text} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3, marginTop: 4 },
  text: { fontSize: 11, fontWeight: '800', color: colors.white },
});
