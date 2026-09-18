import React, { useMemo, useRef, useState } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { supabase } from '../services/supabase';
import { newContentService } from '../services/newContentService';
import { useRemote } from '../hooks/useRemote';
import { ErrorState } from '../components/ErrorState';

interface InboxRow {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

interface InboxData {
  rows: InboxRow[];
  // Date de la dernière ouverture : ce qui est plus récent est « non lu ».
  since: string | null;
}

const formatDateTime = (iso: string) =>
  `${new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à ${new Date(iso).toLocaleTimeString(
    'fr-FR',
    { hour: '2-digit', minute: '2-digit' }
  )}`;

// Notifications déjà envoyées aux adhérents : onglet « Non lues » (ouvert par la
// cloche de l'accueil) et onglet « Historique » (ouvert depuis le profil).
export const NotificationInboxScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const [showAll, setShowAll] = useState(route.params?.all === true);
  const sinceRef = useRef<string | null | undefined>(undefined);

  const { data, loading, refreshing, error, refresh, retry } = useRemote<InboxData>(
    async () => {
      if (sinceRef.current === undefined) {
        sinceRef.current = await newContentService.getLastSeen('notification_history');
      }
      const { data: rows, error: fetchError } = await supabase
        .from('notification_history')
        .select('id, title, body, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (fetchError) throw fetchError;
      // L'ouverture de l'écran marque tout comme lu (le compteur retombe à 0)
      // mais la liste « Non lues » reste affichée pendant cette visite.
      newContentService.markSeen('notification_history');
      return { rows: rows || [], since: sinceRef.current ?? null };
    },
    { rows: [], since: null }
  );

  const isUnread = (row: InboxRow) => Boolean(data.since) && new Date(row.created_at) > new Date(data.since as string);
  const unreadRows = useMemo(() => data.rows.filter(isUnread), [data]);
  const visible = showAll ? data.rows : unreadRows;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('NotificationPreferences')}
          style={styles.iconButton}
          accessibilityLabel="Réglages des notifications"
        >
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, !showAll && styles.tabActive]} onPress={() => setShowAll(false)}>
          <Text style={[styles.tabText, !showAll && styles.tabTextActive]}>
            Non lues{unreadRows.length > 0 ? ` (${unreadRows.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, showAll && styles.tabActive]} onPress={() => setShowAll(true)}>
          <Text style={[styles.tabText, showAll && styles.tabTextActive]}>Historique</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={refresh}
        ListEmptyComponent={
          error ? (
            <ErrorState onRetry={retry} />
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons
                name={showAll ? 'notifications-off-outline' : 'checkmark-done-outline'}
                size={44}
                color={colors.textLight}
              />
              <Text style={styles.emptyText}>
                {showAll ? 'Aucune notification pour le moment.' : 'Tu es à jour, aucune notification non lue.'}
              </Text>
              {!showAll && (
                <TouchableOpacity onPress={() => setShowAll(true)}>
                  <Text style={styles.emptyLink}>Voir l'historique</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
        renderItem={({ item }) => {
          const unread = isUnread(item);
          return (
            <View style={[styles.card, unread && styles.cardUnread]}>
              <View style={styles.iconBox}>
                <Ionicons name="notifications-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.info}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{item.title}</Text>
                  {unread ? <View style={styles.unreadDot} /> : null}
                </View>
                <Text style={styles.body}>{item.body}</Text>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 4,
  },
  tab: { flex: 1, height: 38, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  tabTextActive: { color: colors.white },
  listContent: { padding: spacing.xl, paddingTop: 0 },
  emptyBox: { alignItems: 'center', marginTop: spacing.xl },
  emptyText: { textAlign: 'center', color: colors.textLight, marginTop: spacing.md },
  emptyLink: { color: colors.primary, fontWeight: '800', marginTop: spacing.md },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  cardUnread: { borderLeftColor: colors.primary },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  info: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.text },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginLeft: 8 },
  body: { fontSize: 13, color: colors.text, lineHeight: 18, marginTop: 4 },
  date: { fontSize: 11, color: colors.textLight, marginTop: 6 },
});
