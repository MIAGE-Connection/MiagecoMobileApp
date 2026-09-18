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

interface AuditRow {
  id: string;
  domain: string;
  action: 'add' | 'disable' | 'reactivate';
  requested_by: string | null;
  created_at: string;
  associations: { name: string } | null;
  profiles: { email: string } | null;
}

const ACTIONS: Record<AuditRow['action'], { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  add: { label: 'Domaine ajouté', icon: 'add-circle-outline', color: colors.success },
  disable: { label: 'Domaine désactivé', icon: 'close-circle-outline', color: colors.error },
  reactivate: { label: 'Domaine réactivé', icon: 'refresh-circle-outline', color: colors.primary },
};

const fetchAudit = async (): Promise<AuditRow[]> => {
  const { data, error } = await supabase
    .from('domain_audit_log')
    .select('id, domain, action, requested_by, created_at, associations(name), profiles(email)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data as unknown as AuditRow[]) || [];
};

export const DomainAuditLogScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { data, loading, refreshing, error, refresh, retry } = useRemote<AuditRow[]>(fetchAudit, []);

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
        <Text style={styles.headerTitle}>Journal des domaines</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={refresh}
        ListEmptyComponent={
          error ? <ErrorState onRetry={retry} /> : <Text style={styles.emptyText}>Aucune modification enregistrée.</Text>
        }
        renderItem={({ item }) => {
          const action = ACTIONS[item.action];
          return (
            <View style={styles.card}>
              <Ionicons name={action.icon} size={26} color={action.color} style={{ marginRight: spacing.md }} />
              <View style={styles.info}>
                <Text style={styles.domain}>{item.domain}</Text>
                <Text style={[styles.action, { color: action.color }]}>{action.label}</Text>
                <Text style={styles.meta}>
                  {item.associations?.name || 'Association supprimée'}
                  {item.profiles?.email ? ` · par ${item.profiles.email}` : ''}
                </Text>
                {item.requested_by ? <Text style={styles.meta}>À la demande de {item.requested_by}</Text> : null}
                <Text style={styles.date}>
                  {new Date(item.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
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
  emptyText: { textAlign: 'center', color: colors.textLight, marginTop: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  info: { flex: 1 },
  domain: { fontSize: 15, fontWeight: '800', color: colors.text },
  action: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  meta: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  date: { fontSize: 11, color: colors.textLight, marginTop: 4 },
});
