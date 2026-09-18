import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { legalService, LegalDocument } from '../services/legalService';
import { useAuth } from '../contexts/AuthContext';

export const CguAcceptanceScreen: React.FC = () => {
  const { refresh, signOut } = useAuth();
  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    legalService
      .getDocument('cgu')
      .then(setDoc)
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await legalService.acceptCgu();
      await refresh();
    } catch (error: any) {
      console.error('CguAcceptanceScreen: accept error', error);
      Alert.alert('Erreur', error?.message || "Impossible d'enregistrer ton acceptation.");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Ionicons name="document-text-outline" size={22} color={colors.primary} style={{ marginRight: 10 }} />
        <Text style={styles.headerTitle}>Conditions d'utilisation</Text>
      </View>
      <Text style={styles.subtitle}>
        Les conditions d'utilisation ont été mises à jour. Merci de les accepter pour continuer.
      </Text>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {doc?.content.split('\n\n').map((paragraph, index) => (
          <Text key={index} style={paragraph.length < 60 && !paragraph.includes('.') ? styles.sectionTitle : styles.paragraph}>
            {paragraph}
          </Text>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept} disabled={accepting}>
          {accepting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.acceptButtonText}>J'accepte les conditions d'utilisation</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineButton} onPress={signOut}>
          <Text style={styles.declineButtonText}>Refuser et me déconnecter</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingHorizontal: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    lineHeight: 19,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  paragraph: {
    fontSize: 13,
    color: colors.textLight,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  footer: {
    paddingVertical: spacing.lg,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  declineButton: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  declineButtonText: {
    color: colors.textLight,
    fontSize: 13,
    fontWeight: '600',
  },
});
