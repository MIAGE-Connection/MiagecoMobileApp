import React, { useState } from 'react';
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
import { legalService } from '../services/legalService';
import { useAuth } from '../contexts/AuthContext';

export const AccountDeletionRequestScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleConfirm = () => {
    Alert.alert(
      'Confirmer la demande',
      'Cette action est irréversible une fois traitée par la fédération. Confirmer la demande de suppression ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setSending(true);
            try {
              await legalService.requestAccountDeletion(user.id);
              setSent(true);
            } catch (error: any) {
              console.error('AccountDeletionRequestScreen: error', error);
              Alert.alert('Erreur', error?.message || "Impossible d'envoyer la demande.");
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
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
        {sent ? (
          <>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
            <Text style={styles.sentTitle}>Demande envoyée</Text>
            <Text style={styles.sentText}>
              Ta demande de suppression a bien été transmise à la fédération. Elle sera traitée
              manuellement et ton compte sera supprimé sous peu.
            </Text>
            <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
              <Text style={styles.logoutButtonText}>Se déconnecter</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Ionicons name="warning-outline" size={40} color={colors.error} />
            <Text style={styles.warningTitle}>Cette action est définitive</Text>
            <Text style={styles.warningText}>
              Ta demande sera transmise à l'administration nationale de MIAGE Connection, qui
              procédera à la suppression de ton compte et de tes données personnelles. Cette
              opération ne peut pas être annulée une fois traitée.
            </Text>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} disabled={sending}>
              {sending ? (
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
