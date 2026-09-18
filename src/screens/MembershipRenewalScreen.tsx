import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { useAuth } from '../contexts/AuthContext';
import { DomainNotAllowedError } from '../services/authService';

// Affiché quand la session OAuth est valide mais que l'adhésion a expiré
// (valid_until dépassé) alors que le domaine est toujours actif : un seul
// tap relance ensure_my_profile() sans nouveau passage par Google/Microsoft.
export const MembershipRenewalScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { renewMembership, signOut } = useAuth();
  const navigation = useNavigation<any>();

  const handleRenew = async () => {
    setLoading(true);
    try {
      await renewMembership();
    } catch (error) {
      if (error instanceof DomainNotAllowedError) {
        await signOut();
        navigation.navigate('DomainNotAllowed');
      } else {
        Alert.alert('Erreur', 'Impossible de renouveler ton adhésion pour le moment.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="refresh-outline" size={32} color={colors.primary} />
      </View>

      <Text style={styles.title}>Ton adhésion a expiré</Text>
      <Text style={styles.description}>
        Ton année universitaire est terminée. Renouvelle ton adhésion en un tap pour retrouver
        l'accès à l'espace association.
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleRenew} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>Renouveler mon adhésion</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Accueil')}>
        <Text style={styles.secondaryButtonText}>Continuer en visiteur</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={signOut}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F3FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.textLight,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  logoutText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
