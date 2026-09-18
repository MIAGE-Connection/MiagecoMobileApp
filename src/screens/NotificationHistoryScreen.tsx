import React from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { supabase } from '../services/supabase';
import { useRemote } from '../hooks/useRemote';
import { ErrorState } from '../components/ErrorState';

interface HistoryRow {
  id: string;
  title: string;
  body: string;
  source: 'manual' | 'scheduled';
  sent_count: number;
  created_at: string;
}

const fetchHistory = async (): Promise<HistoryRow[]> => {
  const { data, error } = await supabase
    .from('notification_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
};

const formatDateTime = (iso: string) =>
  `${new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} à ${new Date(
    iso
  ).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

export const NotificationHistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { data, loading, refreshing, error, refresh, retry } = useRemote<HistoryRow[]>(fetchHistory, []);

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historique des envois</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={refresh}
        ListEmptyComponent={
          error ? (
            <ErrorState onRetry={retry} />
          ) : (
            <Text style={styles.emptyText}>
              Aucun envoi enregistré. Les prochaines diffusions apparaîtront ici.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={[styles.badge, item.source === 'scheduled' ? styles.badgeScheduled : styles.badgeManual]}>
                <Ionicons
                  name={item.source === 'scheduled' ? 'time-outline' : 'megaphone-outline'}
                  size={11}
                  color={colors.primary}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.badgeText}>{item.source === 'scheduled' ? 'Programmée' : 'Manuelle'}</Text>
              </View>
              <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body} numberOfLines={3}>
              {item.body}
            </Text>
            <Text style={styles.count}>
              {item.sent_count} appareil{item.sent_count > 1 ? 's' : ''} notifié{item.sent_count > 1 ? 's' : ''}
            </Text>
          </View>
        )}
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  listContent: { padding: spacing.xl, paddingTop: 0 },
  emptyText: { textAlign: 'center', color: colors.textLight, marginTop: spacing.xl, lineHeight: 20 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: spacing.lg, marginBottom: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeManual: { backgroundColor: colors.primarySoft },
  badgeScheduled: { backgroundColor: colors.primarySoft },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  date: { fontSize: 12, color: colors.textLight },
  title: { fontSize: 15, fontWeight: '800', color: colors.text },
  body: { fontSize: 13, color: colors.textLight, lineHeight: 18, marginTop: 4 },
  count: { fontSize: 12, fontWeight: '700', color: colors.primary, marginTop: spacing.sm },
});
