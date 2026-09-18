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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { eventsService } from '../services/eventsService';
import { Event } from '../types/event';

// Réutilise eventsService (RLS filtre déjà : événements publics + événements
// "members" si l'appelant est un adhérent actif).
export const FederalCalendarScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await eventsService.getUpcomingEvents();
      setEvents(data);
    } catch (error) {
      console.error('FederalCalendarScreen: load error', error);
      Alert.alert('Erreur', "Impossible de charger l'agenda.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
        <Text style={styles.headerTitle}>Agenda fédéral</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucun événement à venir.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.dateBox}>
              <Text style={styles.dateDay}>
                {item.start_date ? new Date(item.start_date).getDate() : '-'}
              </Text>
              <Text style={styles.dateMonth}>
                {item.start_date
                  ? new Date(item.start_date).toLocaleDateString('fr-FR', { month: 'short' })
                  : ''}
              </Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.title}>{item.title}</Text>
              {item.location ? <Text style={styles.location}>{item.location}</Text> : null}
            </View>
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
    width: 36,
    height: 36,
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
  emptyText: {
    textAlign: 'center',
    color: colors.textLight,
    marginTop: spacing.xl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F3FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  dateDay: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primary,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  location: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
});
