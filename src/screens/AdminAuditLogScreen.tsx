import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { auditLogService, AuditEntry, describeEntry } from '../services/auditLogService';
import { ErrorState } from '../components/ErrorState';

const ICONS: Record<AuditEntry['action'], { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  member_suspended: { icon: 'ban-outline', color: colors.error },
  member_reactivated: { icon: 'checkmark-circle-outline', color: colors.success },
  referent_appointed: { icon: 'ribbon-outline', color: colors.primary },
  referent_removed: { icon: 'remove-circle-outline', color: colors.textLight },
  role_changed: { icon: 'swap-horizontal-outline', color: colors.highlight },
  membership_end_changed: { icon: 'calendar-outline', color: colors.primary },
  membership_end_applied: { icon: 'calendar-number-outline', color: colors.primary },
  account_purge: { icon: 'trash-outline', color: colors.textLight },
};

const formatDateTime = (iso: string) =>
  `${new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${new Date(iso).toLocaleTimeString(
    'fr-FR',
    { hour: '2-digit', minute: '2-digit' }
  )}`;

// Super admin : historique des actions sensibles (suspension, référents, date de fin d'adhésion).
// Chargé par pages de 50 : le journal peut grossir sans ralentir l'écran.
export const AdminAuditLogScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);

  const loadFirst = useCallback(async () => {
    try {
      const page = await auditLogService.getPage(0);
      setEntries(page.rows);
      setHasMore(page.hasMore);
      setError(false);
    } catch (e) {
      console.error('AdminAuditLogScreen: load error', e);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFirst();
    }, [loadFirst])
  );

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await auditLogService.getPage(entries.length);
      setEntries((current) => [...current, ...page.rows.filter((row) => !current.some((c) => c.id === row.id))]);
      setHasMore(page.hasMore);
    } catch (e) {
      console.error('AdminAuditLogScreen: load more error', e);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Journal des actions</Text>
        <View style={styles.iconButton} />
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          loadFirst();
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <Text style={styles.intro}>
            Suspensions, référents et date de fin d'adhésion. Les actions faites directement dans Supabase apparaissent
            sans auteur. Conservé 1 an.
          </Text>
        }
        ListEmptyComponent={
          error ? <ErrorState onRetry={loadFirst} /> : <Text style={styles.empty}>Aucune action enregistrée.</Text>
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: spacing.lg }} color={colors.primary} /> : null}
        renderItem={({ item }) => {
          const look = ICONS[item.action] ?? ICONS.role_changed;
          return (
            <View style={styles.card}>
              <View style={[styles.iconBox, { backgroundColor: look.color + '1A' }]}>
                <Ionicons name={look.icon} size={20} color={look.color} />
              </View>
              <View style={styles.info}>
                <Text style={styles.text}>{describeEntry(item)}</Text>
                <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
              </View>
            </View>
          );
        }}
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
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  list: { padding: spacing.xl, paddingTop: 0, paddingBottom: spacing.xxl },
  intro: { fontSize: 12, lineHeight: 18, color: colors.textLight, marginBottom: spacing.lg },
  empty: { textAlign: 'center', color: colors.textLight, marginTop: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  text: { fontSize: 14, lineHeight: 20, color: colors.text, fontWeight: '600' },
  date: { fontSize: 12, color: colors.textLight, marginTop: 3 },
});
