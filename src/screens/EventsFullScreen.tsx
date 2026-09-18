import React, { useState, useEffect } from 'react';
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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { eventsService } from '../services/eventsService';

interface Event {
  id: string;
  title: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  description?: string;
  image_url?: string;
}

const FALLBACK_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Hackathon MIAGE',
    start_date: '2026-06-15',
    location: 'PARIS',
    description: '24h de code - Prix à gagner',
  },
  {
    id: '2',
    title: 'Conférence Cloud',
    start_date: '2026-06-10',
    location: 'LYON',
    description: 'Experts du cloud computing',
  },
  {
    id: '3',
    title: 'Réunion régionale',
    start_date: '2026-06-05',
    location: 'NANTERRE',
    description: 'Bilan et perspectives',
  },
];

export const EventsFullScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await eventsService.getAllEvents();
      if (data && data.length > 0) {
        setEvents(data);
      } else {
        console.warn('No events from BD, using fallback');
        setEvents(FALLBACK_EVENTS);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents(FALLBACK_EVENTS);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'TBD';
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = date.toLocaleString('fr-FR', { month: 'short' }).toUpperCase();
      return `${day} ${month}`;
    } catch {
      return dateString;
    }
  };

  const renderEventCard = ({ item }: { item: Event }) => (
    <TouchableOpacity style={styles.eventCard}>
      <View style={styles.cardHeader}>
        <View style={styles.dateBox}>
          <Text style={styles.dateText}>{formatDate(item.start_date)}</Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={colors.textLight} />
            <Text style={styles.locationText}>{item.location || 'TBD'}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.description}>{item.description || ''}</Text>
      <TouchableOpacity style={styles.detailsButton}>
        <Text style={styles.detailsButtonText}>Voir détails</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

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
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEventCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>Aucun événement</Text>
            </View>
          }
        />
      )}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  spacer: {
    width: 40,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  dateBox: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginRight: spacing.md,
  },
  dateText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    color: colors.textLight,
  },
  description: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  detailsButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: spacing.md,
  },
});
