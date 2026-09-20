import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Platform,
  TextInput,
  ScrollView,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { MICROSOFT_LOGIN_ENABLED } from '../config/features';
import { useAuth } from '../contexts/AuthContext';
import { authService, DomainNotAllowedError } from '../services/authService';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { DetailSheet, SheetAction, sheetStyles } from '../components/DetailSheet';
import { openMail } from '../utils/links';

export const AccountScreen: React.FC = () => {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'azure' | null>(null);
  const [howToJoinOpen, setHowToJoinOpen] = useState(false);
  const [email, setEmail] = useState('');
  const { signInWithGoogle, signInWithMicrosoft, domainNotAllowed, clearDomainNotAllowed } = useAuth();
  const navigation = useNavigation<any>();

  // Sur Android, le retour OAuth peut arriver bien après que ce composant ait
  // fini son propre appel (process relancé par le deep link) : le rejet
  // "domaine non autorisé" remonte alors via ce flag global plutôt que par la
  // promesse de handleSignIn.
  useEffect(() => {
    if (domainNotAllowed) {
      clearDomainNotAllowed();
      navigation.navigate('DomainNotAllowed');
    }
  }, [domainNotAllowed, clearDomainNotAllowed, navigation]);

  const handleSignIn = async (provider: 'google' | 'azure') => {
    const typed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(typed)) {
      Alert.alert('Adresse requise', "Saisis l'adresse email de ton association pour continuer.");
      return;
    }
    setLoadingProvider(provider);
    try {
      // Vérification AVANT Google : un domaine refusé ne voit jamais l'écran d'autorisation.
      const allowed = await authService.isEmailDomainAllowed(typed);
      if (!allowed) {
        navigation.navigate('DomainNotAllowed');
        return;
      }
      if (provider === 'google') {
        await signInWithGoogle(typed);
      } else {
        await signInWithMicrosoft(typed);
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
            <Text style={styles.adminTagText}>ESPACE ADHÉRENT</Text>
          </View>
        </View>

        <Text style={styles.headerTitle}>Connecte-toi à ton espace adhérent.</Text>
        <Text style={styles.headerSubtitle}>
          Réservé aux adhérents des associations fédérées MIAGE Connection.
        </Text>
      </View>

      <View style={styles.contentCard}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.emailLabel}>Ton adresse email d'association</Text>
          <TextInput
            style={styles.emailInput}
            value={email}
            onChangeText={setEmail}
            placeholder="prenom.nom@ton-asso.fr"
            placeholderTextColor={colors.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
          />
          <Text style={styles.emailHint}>
            Nous vérifions ton adresse avant d'ouvrir Google : rien n'est partagé si ton domaine n'est pas autorisé.
          </Text>

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

          {MICROSOFT_LOGIN_ENABLED && (
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
          )}

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.infoBoxText}>
              Tu es membre d'une asso fédérée ? Connecte-toi avec ton adresse d'association. Si ton
              asso souhaite des comptes pour ses membres, elle peut contacter la fédération.
            </Text>
          </View>

          <TouchableOpacity style={styles.visitorLink} onPress={() => setHowToJoinOpen(true)}>
            <Text style={styles.visitorText}>
              <Text style={styles.visitorLinkText}>Comment rejoindre ?</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.visitorLink}
            onPress={() => navigation.navigate('Accueil')}
          >
            <Text style={styles.visitorText}>
              Tu n'es pas adhérent ? <Text style={styles.visitorLinkText}>Continuer en visiteur</Text>
            </Text>
          </TouchableOpacity>

          <DetailSheet visible={howToJoinOpen} onClose={() => setHowToJoinOpen(false)}>
            <Text style={sheetStyles.title}>Comment rejoindre ?</Text>
            <Text style={sheetStyles.body}>
              1. Il faut appartenir à une association MIAGE fédérée.{'\n\n'}
              2. Connecte-toi avec Google en utilisant l'adresse email de ton association ou de ton université : c'est
              elle qui te rattache automatiquement à ton association.{'\n\n'}
              3. Si l'accès est refusé, le domaine de ton adresse n'est pas encore rattaché à ton association.
              Demande à ton bureau de le signaler à la fédération.
            </Text>
            <SheetAction label="Écrire à la fédération" primary onPress={() => openMail('bureau@miage-connection.fr')} />
          </DetailSheet>

          <View style={styles.legalRow}>
            <TouchableOpacity onPress={() => navigation.navigate('LegalDocument', { documentKey: 'cgu' })}>
              <Text style={styles.legalLinkText}>CGU</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>·</Text>
            <TouchableOpacity onPress={() => navigation.navigate('LegalDocument', { documentKey: 'confidentialite' })}>
              <Text style={styles.legalLinkText}>Confidentialité</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>·</Text>
            <TouchableOpacity onPress={() => navigation.navigate('LegalDocument', { documentKey: 'mentions_legales' })}>
              <Text style={styles.legalLinkText}>Mentions légales</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    fontSize: 11,
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
  emailLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6 },
  emailInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
  },
  emailHint: { fontSize: 12, lineHeight: 17, color: colors.textLight, marginTop: 8, marginBottom: spacing.lg },
  infoBox: {
    backgroundColor: colors.primarySoft,
    padding: spacing.lg,
    borderRadius: 20,
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(14, 26, 74, 0.7)',
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
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  legalLinkText: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '600',
  },
  legalSeparator: {
    fontSize: 11,
    color: colors.textLight,
    marginHorizontal: spacing.sm,
  },
});
