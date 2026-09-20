import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, Platform, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface HeaderProps {
  title: string;
  subtitle?: string;
  // Affiche une flèche de retour à gauche du titre.
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onBack }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, onBack ? styles.containerWithBack : null]}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton} accessibilityLabel="Retour">
            <Ionicons name="chevron-back" size={26} color={colors.white} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.texts}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.primary,
  },
  containerWithBack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.xs,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  texts: { flex: 1 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
});
