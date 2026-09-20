import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { deletionRequestsService, MyDeletionRequest } from '../services/deletionRequestsService';
import { useAuth } from '../contexts/AuthContext';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export const AccountDeletionRequestScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<MyDeletionRequest | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setPending(await deletionRequestsService.getMine(user.id));
      setLoadError(false);
    } catch (error) {
      console.error('AccountDeletionRequestScreen: load error', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      await load();
    } catch (error: any) {
      console.error('AccountDeletionRequestScreen: error', error);
      Alert.alert('Erreur', error?.message || "L'opération a échoué.");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = () => {
    Alert.alert(
      'Confirmer la demande',
      "Ton compte et tes données seront supprimés par la fédération. Tant que ce n'est pas fait, tu peux annuler ta demande depuis cet écran. Confirmer ?",
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', style: 'destructive', onPress: () => run(() => deletionRequestsService.request()) },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert('Annuler ta demande ?', "Ton compte sera conservé, comme si tu n'avais rien demandé.", [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui, annuler ma demande', onPress: () => run(() => deletionRequestsService.cancelMine()) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Supprimer mon compte</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : loadError ? (
          <>
            <Text style={styles.warningText}>Impossible de vérifier l'état de ta demande. Vérifie ta connexion.</Text>
            <TouchableOpacity style={styles.logoutButton} onPress={() => { setLoading(true); load(); }}>
              <Text style={styles.logoutButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </>
        ) : pending ? (
          <>
            <Ionicons name="time-outline" size={48} color={colors.primary} />
            <Text style={styles.sentTitle}>Demande en cours</Text>
            <Text style={styles.sentText}>
              Tu as demandé la suppression de ton compte le {formatDate(pending.requested_at)}. La fédération la traite
              manuellement, sous un mois au plus. Ton compte reste actif tant qu'elle n'est pas traitée.
            </Text>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={busy}>
              {busy ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.cancelButtonText}>Annuler ma demande</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
              <Text style={styles.logoutButtonText}>Se déconnecter</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Ionicons name="warning-outline" size={40} color={colors.error} />
            <Text style={styles.warningTitle}>Cette action est définitive</Text>
            <Text style={styles.warningText}>
              Ta demande sera transmise à l'administration nationale de MIAGE Connection, qui procédera à la
              suppression de ton compte et de tes données personnelles. Tant qu'elle n'est pas traitée, tu peux
              l'annuler à tout moment ; une fois ton compte supprimé, cela ne peut plus être annulé.
            </Text>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} disabled={busy}>
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.confirmButtonText}>Demander la suppression de mon compte</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  warningText: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  confirmButton: {
    backgroundColor: colors.error,
    borderRadius: 10,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  sentTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sentText: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  cancelButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  cancelButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  logoutButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  logoutButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
