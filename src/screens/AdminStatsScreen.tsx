import React, { useMemo } from 'react';
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
  RefreshControl,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { supabase } from '../services/supabase';
import { eventInterestService } from '../services/eventInterestService';
import { useRemote } from '../hooks/useRemote';
import { ErrorState } from '../components/ErrorState';

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  role: 'member' | 'admin_association' | 'admin_national';
  is_suspended: boolean;
  valid_until: string | null;
  association_id: string | null;
  position_in_association: string | null;
  member_positions: { label: string } | null;
  graduation_year: number | null;
}

interface StatsData {
  profiles: ProfileRow[];
  associations: { id: string; name: string }[];
  events: { id: string; title: string; start_date: string; location: string | null }[];
  interests: Record<string, number>;
}

const EMPTY: StatsData = { profiles: [], associations: [], events: [], interests: {} };
const SOON_DAYS = 30;

const formatDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '—');

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

// Vue d'ensemble pour le super admin : adhérents actifs, adhésions à renouveler,
// suivi des événements, et export CSV des adhérents.
export const AdminStatsScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const { data, loading, refreshing, error, refresh, retry } = useRemote<StatsData>(async () => {
    const [profiles, associations, events, interests] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, full_name, role, is_suspended, valid_until, association_id, position_in_association, member_positions(label), graduation_year'),
      supabase.from('associations').select('id, name').order('name'),
      supabase
        .from('events')
        .select('id, title, start_date, location')
        .eq('is_published', true)
        .gte('start_date', new Date().toISOString())
        .order('start_date'),
      eventInterestService.getCounts().catch(() => ({} as Record<string, number>)),
    ]);
    if (profiles.error) throw profiles.error;
    if (associations.error) throw associations.error;
    if (events.error) throw events.error;
    return {
      profiles: (profiles.data as unknown as ProfileRow[]) || [],
      associations: associations.data || [],
      events: events.data || [],
      interests,
    };
  }, EMPTY);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + SOON_DAYS);

    const isActive = (p: ProfileRow) => !p.is_suspended && !!p.valid_until && new Date(p.valid_until) >= today;
    const isSoon = (p: ProfileRow) => isActive(p) && new Date(p.valid_until as string) <= limit;

    // Le super admin n'est rattaché à aucune association : on ne le compte pas comme adhérent.
    const members = data.profiles.filter((p) => p.role !== 'admin_national');
    const active = members.filter(isActive);
    const soon = active.filter(isSoon).sort((a, b) => (a.valid_until as string).localeCompare(b.valid_until as string));

    const perAssociation = data.associations
      .map((asso) => {
        const list = members.filter((p) => p.association_id === asso.id);
        return {
          id: asso.id,
          name: asso.name,
          active: list.filter(isActive).length,
          soon: list.filter(isSoon).length,
          hasReferent: list.some((p) => p.role === 'admin_association'),
        };
      })
      .sort((a, b) => b.active - a.active);

    const topEvents = data.events
      .filter((e) => (data.interests[e.id] || 0) > 0)
      .sort((a, b) => (data.interests[b.id] || 0) - (data.interests[a.id] || 0))
      .slice(0, 5);

    return {
      total: members.length,
      active: active.length,
      soon,
      suspended: members.filter((p) => p.is_suspended).length,
      perAssociation,
      topEvents,
      withoutReferent: perAssociation.filter((a) => !a.hasReferent).length,
      isActive,
    };
  }, [data]);

  const assoName = (id: string | null) => data.associations.find((a) => a.id === id)?.name || '—';

  const exportCsv = async () => {
    const header = ['Nom', 'Email', 'Association', 'Poste', 'Promotion', 'Rôle', 'Valide jusqu\'au', 'Statut'];
    const lines = data.profiles
      .filter((p) => p.role !== 'admin_national')
      .map((p) =>
        [
          p.full_name,
          p.email,
          assoName(p.association_id),
          p.member_positions?.label ?? p.position_in_association,
          p.graduation_year,
          p.role === 'admin_association' ? 'Référent' : 'Adhérent',
          p.valid_until,
          p.is_suspended ? 'Suspendu' : stats.isActive(p) ? 'Actif' : 'Expiré',
        ]
          .map(csvCell)
          .join(';')
      );
    try {
      await Share.share({
        title: 'Adhérents MIAGE Connection',
        message: [header.map(csvCell).join(';'), ...lines].join('\n'),
      });
    } catch {
      Alert.alert('Erreur', "Impossible d'ouvrir le partage.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Statistiques</Text>
        <TouchableOpacity onPress={exportCsv} style={styles.backButton} accessibilityLabel="Exporter les adhérents">
          <Ionicons name="share-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && data.profiles.length === 0 ? (
        <ErrorState onRetry={retry} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        >
          <View style={styles.tiles}>
            <Tile label="Adhérents actifs" value={stats.active} sub={`sur ${stats.total} comptes`} />
            <Tile label="À renouveler" value={stats.soon.length} sub={`sous ${SOON_DAYS} jours`} warn={stats.soon.length > 0} />
            <Tile label="Suspendus" value={stats.suspended} />
            <Tile label="Assos sans référent" value={stats.withoutReferent} warn={stats.withoutReferent > 0} />
          </View>

          <Text style={styles.sectionTitle}>Par association</Text>
          <View style={styles.card}>
            {stats.perAssociation.length === 0 ? <Text style={styles.empty}>Aucune association.</Text> : null}
            {stats.perAssociation.map((asso, index) => (
              <View key={asso.id} style={[styles.row, index > 0 && styles.rowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{asso.name}</Text>
                  <Text style={styles.rowSub}>
                    {asso.hasReferent ? 'Référent désigné' : 'Aucun référent'}
                    {asso.soon > 0 ? ` · ${asso.soon} à renouveler` : ''}
                  </Text>
                </View>
                <Text style={styles.rowValue}>{asso.active}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Adhésions qui expirent bientôt</Text>
          <View style={styles.card}>
            {stats.soon.length === 0 ? <Text style={styles.empty}>Aucune adhésion à renouveler dans les {SOON_DAYS} jours.</Text> : null}
            {stats.soon.slice(0, 20).map((p, index) => (
              <View key={p.id} style={[styles.row, index > 0 && styles.rowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{p.full_name || p.email}</Text>
                  <Text style={styles.rowSub}>{assoName(p.association_id)}</Text>
                </View>
                <Text style={styles.rowDate}>{formatDate(p.valid_until)}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Événements les plus suivis</Text>
          <View style={styles.card}>
            {stats.topEvents.length === 0 ? (
              <Text style={styles.empty}>Aucun « Intéressé » sur les événements à venir.</Text>
            ) : null}
            {stats.topEvents.map((event, index) => (
              <View key={event.id} style={[styles.row, index > 0 && styles.rowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{event.title}</Text>
                  <Text style={styles.rowSub}>
                    {formatDate(event.start_date)}
                    {event.location ? ` · ${event.location}` : ''}
                  </Text>
                </View>
                <Text style={styles.rowValue}>{data.interests[event.id]}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.exportButton} onPress={exportCsv} activeOpacity={0.8} accessibilityLabel="Exporter les statistiques">
            <Ionicons name="share-outline" size={18} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.exportText}>Exporter les adhérents (CSV)</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const Tile: React.FC<{ label: string; value: number; sub?: string; warn?: boolean }> = ({ label, value, sub, warn }) => (
  <View style={styles.tile}>
    <Text style={[styles.tileValue, warn && { color: colors.error }]}>{value}</Text>
    <Text style={styles.tileLabel}>{label}</Text>
    {sub ? <Text style={styles.tileSub}>{sub}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  content: { padding: spacing.xl, paddingTop: 0, paddingBottom: 60 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  tileValue: { fontSize: 28, fontWeight: '900', color: colors.primary },
  tileLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 2 },
  tileSub: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  rowValue: { fontSize: 18, fontWeight: '900', color: colors.primary, marginLeft: spacing.md },
  rowDate: { fontSize: 12, fontWeight: '700', color: colors.error, marginLeft: spacing.md },
  empty: { textAlign: 'center', color: colors.textLight, paddingVertical: spacing.lg, fontSize: 13 },
  exportButton: {
    marginTop: spacing.xl,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});
