import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { CategoryItem } from '../components/CategoryItem';
import { FeaturedEventCard } from '../components/FeaturedEventCard';
import { statsService } from '../services/statsService';
import { featuredEventService, FeaturedEvent } from '../services/featuredEventService';

const FALLBACK_FEATURED_EVENT: FeaturedEvent = {
  id: '1',
  title: 'Congrès National MIAGE 2026',
  description: '3 jours - 18 universités - 600 MIAGistes réunis',
  start_date: '2026-11-21',
  end_date: '2026-11-23',
  location: 'MARSEILLE',
  ticket_url: 'https://miage-congress.fr',
  stats: '600 MIAGistes attendus',
  is_published: true,
};

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState({
    newsCount: 0,
    eventsCount: 0,
    associationsCount: 0,
  });
  const [featuredEvent, setFeaturedEvent] = useState<FeaturedEvent | null>(FALLBACK_FEATURED_EVENT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [news, events, associations, featured] = await Promise.all([
        statsService.getTotalNewsCount(),
        statsService.getUpcomingEventsCount(),
        statsService.getAssociationsCount(),
        featuredEventService.getFeaturedEvent(),
      ]);
      setStats({
        newsCount: news,
        eventsCount: events,
        associationsCount: associations,
      });
      if (featured) {
        setFeaturedEvent(featured);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoPill}>
            <Text style={styles.logoText}>mc</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Compte', { screen: 'NotificationPreferences' })}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>
            BONJOUR MIAGISTE <Text style={styles.emoji}>👋</Text>
          </Text>
          <Text style={styles.mainTitle}>
            Bienvenue dans le réseau MIAGE Connection.
          </Text>
          <Text style={styles.description}>
            Le compagnon mobile des MIAGistes : actualités, événements, associations et ressources, au même endroit.
          </Text>
        </View>

        {/* Featured Card */}
        {featuredEvent && (
          <FeaturedEventCard
            title={featuredEvent.title}
            date={featuredEvent.start_date ? new Date(featuredEvent.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }).toUpperCase() : 'À VENIR'}
            location={featuredEvent.location || 'TBD'}
            stats={featuredEvent.stats || ''}
            ticketUrl={featuredEvent.ticket_url}
            onPressProgram={() => {}}
          />
        )}

        {/* Explorer Section */}
        <View style={styles.explorerHeader}>
          <Text style={styles.explorerTitle}>Explorer</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>Tout voir</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          <CategoryItem
            title="Actualités"
            subtitle="Découvrez nos publications"
            iconName="newspaper-outline"
            iconColor={colors.iconBlue}
            onPress={() => navigation.navigate('Actualités')}
          />
          <CategoryItem
            title="Événements"
            subtitle="À venir"
            iconName="calendar-outline"
            iconColor={colors.iconRed}
            onPress={() => navigation.navigate('EventsFullScreen')}
          />
          <CategoryItem
            title="Associations"
            subtitle="Explorez le réseau"
            iconName="people-outline"
            iconColor={colors.iconGreen}
            onPress={() => navigation.navigate('Hub MIAGistes', { screen: 'AssociationsDirectory' })}
          />
          <CategoryItem
            title="Actu Admin"
            subtitle="Évolutions fédération"
            iconName="newspaper-outline"
            iconColor={colors.iconYellow}
            onPress={() => navigation.navigate('ActuAdmin')}
          />
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  logoContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -1,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  notificationDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.tagRed,
    borderWidth: 2,
    borderColor: colors.white,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100, // Space for custom tab bar
  },
  welcomeSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  emoji: {
    fontSize: 14,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    lineHeight: 34,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
  },
  explorerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  explorerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  viewAll: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
