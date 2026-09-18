import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { eventsService } from '../services/eventsService';
import { Event } from '../types/event';
import { useRemote } from '../hooks/useRemote';
import { ErrorState } from '../components/ErrorState';
import { DetailSheet, SheetAction, sheetStyles } from '../components/DetailSheet';
import { addToCalendar, formatLongDate, formatTime } from '../utils/links';

const dayMonth = (iso?: string | null) => {
  if (!iso) return 'TBD';
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('fr-FR', { month: 'short' }).toUpperCase().replace('.', '');
  return `${day} ${month}`;
};

export const EventsFullScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { data, loading, refreshing, error, refresh, retry } = useRemote<Event[]>(
    () => eventsService.getAllEvents(),
    []
  );
  const [selected, setSelected] = useState<Event | null>(null);

  // À venir d'abord (le plus proche en premier), puis les événements passés.
  const events = useMemo(() => {
    const now = Date.now();
    const upcoming = data.filter((e) => new Date(e.start_date ?? 0).getTime() >= now);
    const past = data.filter((e) => new Date(e.start_date ?? 0).getTime() < now).reverse();
    return [...upcoming, ...past];
  }, [data]);

  const renderEventCard = ({ item }: { item: Event }) => {
    const past = new Date(item.start_date ?? 0).getTime() < Date.now();
    return (
      <TouchableOpacity
        style={[styles.eventCard, past && styles.eventCardPast]}
        onPress={() => setSelected(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.dateBox, past && styles.dateBoxPast]}>
            <Text style={styles.dateText}>{dayMonth(item.start_date)}</Text>
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.textLight} />
              <Text style={styles.locationText}>{item.location || 'Lieu à confirmer'}</Text>
              {past ? <Text style={styles.pastTag}>Terminé</Text> : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.border} />
        </View>
        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Événements</Text>
        <View style={styles.spacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && data.length === 0 ? (
        <ErrorState onRetry={retry} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEventCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={refresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>Aucun événement pour le moment</Text>
            </View>
          }
        />
      )}

      <DetailSheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <Text style={sheetStyles.title}>{selected.title}</Text>
            <Text style={sheetStyles.meta}>
              {formatLongDate(selected.start_date)} à {formatTime(selected.start_date)}
              {selected.end_date ? ` – ${formatTime(selected.end_date)}` : ''}
            </Text>
            {selected.location ? <Text style={sheetStyles.meta}>📍 {selected.location}</Text> : null}
            {selected.description ? (
              <Text style={sheetStyles.body} selectable>
                {selected.description}
              </Text>
            ) : null}
            <SheetAction label="Ajouter à mon calendrier" primary onPress={() => addToCalendar(selected)} />
          </>
        )}
      </DetailSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, flex: 1, textAlign: 'center' },
  spacer: { width: 44 },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  eventCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventCardPast: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  dateBox: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.md,
    minWidth: 58,
    alignItems: 'center',
  },
  dateBoxPast: { backgroundColor: colors.textLight },
  dateText: { fontSize: 12, fontWeight: '800', color: colors.white },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  locationText: { fontSize: 12, color: colors.textLight },
  pastTag: { fontSize: 11, color: colors.textLight, fontWeight: '700', marginLeft: 6 },
  description: { fontSize: 13, color: colors.textLight, lineHeight: 18, marginTop: spacing.md },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontSize: 14, color: colors.textLight, marginTop: spacing.md },
});
