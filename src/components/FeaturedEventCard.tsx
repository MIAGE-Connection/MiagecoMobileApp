import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface FeaturedEventCardProps {
  title: string;
  date: string;
  location: string;
  stats: string;
  ticketUrl?: string;
  programUrl?: string;
  onPressRegister?: () => void;
}

export const FeaturedEventCard: React.FC<FeaturedEventCardProps> = ({
  title,
  date,
  location,
  stats,
  ticketUrl,
  programUrl,
  onPressRegister,
}) => {
  const handleRegisterPress = () => {
    if (ticketUrl) {
      Linking.openURL(ticketUrl);
    } else if (onPressRegister) {
      onPressRegister();
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.tagContainer}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>À VENIR</Text>
          </View>
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.date}>{date}</Text>
          <Text style={styles.location}>{location}</Text>
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.stats}>{stats}</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegisterPress}
        >
          <Text style={styles.registerButtonText}>S'inscrire</Text>
        </TouchableOpacity>
        {programUrl ? (
          <TouchableOpacity
            style={styles.programButton}
            onPress={() => Linking.openURL(programUrl).catch(() => {})}
          >
            <Ionicons name="document-outline" size={16} color={colors.primary} />
            <Text style={styles.programButtonText}>Programme</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primaryDeep,
    borderRadius: 20,
    padding: spacing.lg,
    marginVertical: spacing.lg,
    shadowColor: colors.primaryDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  tagContainer: {
    marginRight: spacing.md,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  headerContent: {
    flex: 1,
  },
  date: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 2,
  },
  location: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.white,
    marginBottom: spacing.sm,
  },
  stats: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  registerButton: {
    flex: 1,
    backgroundColor: colors.buttonOrange,
    paddingVertical: spacing.md,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  programButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.white,
    paddingVertical: spacing.md,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  programButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
});
