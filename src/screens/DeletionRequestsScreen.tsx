import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { deletionRequestsService, DeletionRequest } from '../services/deletionRequestsService';

// Délai RGPD : réponse sous un mois à compter de la demande.
const LEGAL_DELAY_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export const DeletionRequestsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await deletionRequestsService.list();
      // En attente d'abord, puis les traitées.
      setRequests([...data].sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending')));
    } catch (error) {
      console.error('DeletionRequestsScreen: load error', error);
      Alert.alert('Erreur', 'Impossible de charger les demandes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleProcessed = (item: DeletionRequest) => {
    Alert.alert(
      'Marquer comme traitée ?',
      "À faire une fois le compte supprimé (ou la demande refusée) côté Supabase. Cette action ne supprime pas le compte.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Marquer traitée',
          onPress: async () => {
            setBusyId(item.id);
            try {
              await deletionRequestsService.markProcessed(item.id);
              await load();
            } catch (error) {
              console.error('DeletionRequestsScreen: update error', error);
              Alert.alert('Erreur', 'Impossible de mettre à jour la demande.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: DeletionRequest }) => {
    const pending = item.status === 'pending';
    const daysLeft = LEGAL_DELAY_DAYS - Math.floor((Date.now() - new Date(item.requested_at).getTime()) / DAY_MS);
    const urgent = pending && daysLeft <= 7;

    return (
      <View style={[styles.card, pending && styles.cardPending, urgent && styles.cardUrgent]}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={styles.name} selectable>
              {item.profiles?.full_name || item.profiles?.email || 'Compte introuvable'}
            </Text>
            {item.profiles?.full_name ? (
              <Text style={styles.email} selectable>
                {item.profiles.email}
              </Text>
            ) : null}
            <Text style={styles.meta}>{item.profiles?.associations?.name || 'Sans association'}</Text>
          </View>
          <View style={[styles.badge, pending ? styles.badgePending : styles.badgeDone]}>
            <Text style={[styles.badgeText, pending ? styles.badgeTextPending : styles.badgeTextDone]}>
              {pending ? 'En attente' : 'Traitée'}
            </Text>
          </View>
        </View>

        <Text style={styles.meta}>Demandée le {formatDate(item.requested_at)}</Text>
        {pending ? (
          <Text style={[styles.delay, urgent && styles.delayUrgent]}>
            {daysLeft > 0 ? `Délai légal : ${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}` : 'Délai légal dépassé'}
          </Text>
        ) : item.processed_at ? (
          <Text style={styles.meta}>Traitée le {formatDate(item.processed_at)}</Text>
        ) : null}

        {pending && (
          <TouchableOpacity
            style={styles.processButton}
            onPress={() => handleProcessed(item)}
            disabled={busyId === item.id}
          >
            {busyId === item.id ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.processButtonText}>Marquer comme traitée</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Demandes de suppression</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.infoText}>
              La suppression se fait dans Supabase (Authentication → Users). Une fois le compte supprimé, la demande
              disparaît de cette liste.
            </Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>Aucune demande de suppression.</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  listContent: {
    padding: spacing.xl,
    paddingTop: 0,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.text,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textLight,
    marginTop: spacing.xl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.border,
  },
  cardPending: {
    borderLeftColor: colors.primary,
  },
  cardUrgent: {
    borderLeftColor: colors.error,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  cardInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  email: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  delay: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
  delayUrgent: {
    color: colors.error,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePending: {
    backgroundColor: colors.primarySoft,
  },
  badgeDone: {
    backgroundColor: '#E7F6EC',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextPending: {
    color: colors.primary,
  },
  badgeTextDone: {
    color: '#1E7B3F',
  },
  processButton: {
    marginTop: spacing.md,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
