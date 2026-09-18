import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { useAuth } from '../contexts/AuthContext';
import { DomainNotAllowedError } from '../services/authService';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export const AccountScreen: React.FC = () => {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'azure' | null>(null);
  const { signInWithGoogle, signInWithMicrosoft } = useAuth();
  const navigation = useNavigation<any>();

  const handleSignIn = async (provider: 'google' | 'azure') => {
    setLoadingProvider(provider);
    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else {
        await signInWithMicrosoft();
      }
    } catch (error: any) {
      if (error instanceof DomainNotAllowedError) {
        navigation.navigate('DomainNotAllowed');
      } else if (error?.message !== 'Connexion annulée') {
        Alert.alert('Erreur de connexion', error?.message || 'Une erreur est survenue.');
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.darkHeader}>
        <View style={styles.headerTop}>
          <View style={styles.logoPill}>
            <Text style={styles.logoText}>mc</Text>
          </View>
          <View style={styles.adminTag}>
            <Ionicons name="shield-checkmark" size={12} color={colors.white} style={{ marginRight: 4 }} />
            <Text style={styles.adminTagText}>ESPACE ADMIN</Text>
          </View>
        </View>

        <Text style={styles.headerTitle}>Connecte-toi à ton espace association.</Text>
        <Text style={styles.headerSubtitle}>
          Réservé aux adhérents des associations fédérées MIAGE Connection.
        </Text>
      </View>

      <View style={styles.contentCard}>
        <View style={styles.scrollContent}>
          <TouchableOpacity
            style={styles.oauthButton}
            onPress={() => handleSignIn('google')}
            disabled={loadingProvider !== null}
            activeOpacity={0.8}
          >
            {loadingProvider === 'google' ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color={colors.text} style={{ marginRight: 10 }} />
                <Text style={styles.oauthButtonText}>Continuer avec Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.oauthButton, styles.oauthButtonSpacing]}
            onPress={() => handleSignIn('azure')}
            disabled={loadingProvider !== null}
            activeOpacity={0.8}
          >
            {loadingProvider === 'azure' ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <Ionicons name="logo-microsoft" size={20} color={colors.text} style={{ marginRight: 10 }} />
                <Text style={styles.oauthButtonText}>Continuer avec Microsoft</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.infoBoxText}>
              Tu es membre d'une asso fédérée ? Connecte-toi avec ton adresse d'association. Si ton
              asso souhaite des comptes pour ses membres, elle peut contacter la fédération.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.visitorLink}
            onPress={() => navigation.navigate('Accueil')}
          >
            <Text style={styles.visitorText}>
              Tu n'es pas adhérent ? <Text style={styles.visitorLinkText}>Continuer en visiteur</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cardDark,
  },
  darkHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  logoPill: {
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  adminTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  adminTagText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.white,
    lineHeight: 34,
    marginBottom: spacing.md,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 20,
  },
  contentCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginTop: -20,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  oauthButton: {
    backgroundColor: colors.white,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  oauthButtonSpacing: {
    marginTop: spacing.md,
  },
  oauthButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  infoBox: {
    backgroundColor: '#F5F3FF',
    padding: spacing.lg,
    borderRadius: 20,
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(22, 17, 58, 0.7)',
    lineHeight: 18,
  },
  visitorLink: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  visitorText: {
    fontSize: 13,
    color: colors.textLight,
  },
  visitorLinkText: {
    color: colors.text,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
