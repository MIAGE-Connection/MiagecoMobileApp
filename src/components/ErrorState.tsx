import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface Props {
  onRetry: () => void;
  message?: string;
}

export const ErrorState: React.FC<Props> = ({
  onRetry,
  message = 'Impossible de charger les données. Vérifie ta connexion.',
}) => (
  <View style={styles.container}>
    <Ionicons name="cloud-offline-outline" size={44} color={colors.textLight} />
    <Text style={styles.text}>{message}</Text>
    <TouchableOpacity style={styles.button} onPress={onRetry} activeOpacity={0.8}>
      <Ionicons name="refresh" size={16} color={colors.white} style={{ marginRight: 6 }} />
      <Text style={styles.buttonText}>Réessayer</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, marginTop: 40 },
  text: { fontSize: 14, color: colors.textLight, textAlign: 'center', marginTop: spacing.md, lineHeight: 20 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  buttonText: { color: colors.white, fontWeight: '800', fontSize: 14 },
});
