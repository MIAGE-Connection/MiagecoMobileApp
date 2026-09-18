import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { CategoryItem } from '../components/CategoryItem';
import { FeaturedEventCard } from '../components/FeaturedEventCard';
import { statsService } from '../services/statsService';
import { featuredEventService, FeaturedEvent } from '../services/featuredEventService';
import { siteSettingsService, HomeStatSetting } from '../services/siteSettingsService';
import { useAuth } from '../contexts/AuthContext';
import { useNewCounts } from '../hooks/useNewCounts';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, isActiveMember } = useAuth();
  const { counts } = useNewCounts();
  const unreadNotifications = counts.notification_history;
  const [stats, setStats] = useState({
    eventsCount: 0,
    associationsCount: 0,
  });
  const [customStats, setCustomStats] = useState<HomeStatSetting[]>([]);
  const [featuredEvent, setFeaturedEvent] = useState<FeaturedEvent | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // L'onglet Accueil reste monté : on recharge à chaque retour sur l'écran
  // pour refléter les modifications faites dans le panneau admin.
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [events, associations, featured, custom] = await Promise.all([
        statsService.getUpcomingEventsCount(),
        statsService.getAssociationsCount(),
        featuredEventService.getFeaturedEvent(),
        siteSettingsService.getHomeStats(),
      ]);
      setStats({
        eventsCount: events,
        associationsCount: associations,
      });
      setCustomStats(custom);
      setFeaturedEvent(featured);
      setLoadError(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={colors.white}
            colors={[colors.primary]}
          />
        }
      >
        {/* Bandeau fédération */}
        <View style={styles.hero}>
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.logoPill}>
                <Text style={styles.logoText}>mc</Text>
              </View>
              <Text style={styles.brandText}>MIAGE Connection</Text>
            </View>
            {user && isActiveMember ? (
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => navigation.navigate('NotificationInbox')}
                accessibilityLabel="Historique des notifications"
              >
                <Ionicons name="notifications-outline" size={22} color={colors.white} />
                {unreadNotifications > 0 ? (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.greeting}>LA FÉDÉRATION NATIONALE DES ÉTUDIANTS ET DIPLÔMÉS DE MIAGE</Text>
          <Text style={styles.mainTitle}>Bienvenue dans le réseau MIAGE Connection.</Text>
          <Text style={styles.description}>
            Actualités, événements, associations et ressources des MIAGistes, au même endroit.
          </Text>
        </View>

        {/* Chiffres clés */}
        <View style={styles.statsCard}>
          {[
            { label: 'Associations', auto: String(stats.associationsCount) },
            { label: 'Événements', auto: String(stats.eventsCount) },
            { label: 'MIAGistes', auto: '—' },
          ].map((block, i) => (
            <React.Fragment key={block.label}>
              {i > 0 && <View style={styles.statDivider} />}
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>{customStats[i]?.value || block.auto}</Text>
                <Text style={styles.statLabel}>{customStats[i]?.label || block.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        <View style={styles.body}>
        {loadError && (
          <TouchableOpacity
            style={styles.errorBanner}
            onPress={() => {
              setRefreshing(true);
              loadData();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-offline-outline" size={16} color={colors.error} style={{ marginRight: 8 }} />
            <Text style={styles.errorBannerText}>Impossible de charger les données. Touche pour réessayer.</Text>
          </TouchableOpacity>
        )}

        {/* Featured Card */}
        {featuredEvent && (
          <FeaturedEventCard
            title={featuredEvent.title}
            date={featuredEvent.start_date ? new Date(featuredEvent.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }).toUpperCase() : 'À VENIR'}
            location={featuredEvent.location || 'TBD'}
            stats={featuredEvent.stats || ''}
            ticketUrl={featuredEvent.ticket_url}
            programUrl={featuredEvent.program_url}
          />
        )}

        {/* Explorer Section */}
        <View style={styles.explorerHeader}>
          <Text style={styles.explorerTitle}>Explorer</Text>
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
            onPress={() => navigation.navigate('Associations')}
          />
          <CategoryItem
            title="Actu Admin"
            subtitle="Évolutions fédération"
            iconName="newspaper-outline"
            iconColor={colors.iconYellow}
            onPress={() => navigation.navigate('ActuAdmin')}
          />
        </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 100, // Space for custom tab bar
  },
  hero: {
    backgroundColor: colors.primary,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 50) + spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: 56,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoPill: {
    backgroundColor: colors.white,
    borderRadius: 10,
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm + 2,
  },
  logoText: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -1,
  },
  brandText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.tagRed,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  greeting: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: spacing.sm,
    letterSpacing: 0.8,
    lineHeight: 15,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.white,
    lineHeight: 32,
    marginBottom: spacing.sm + 2,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 19,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 20,
    marginHorizontal: spacing.xl,
    marginTop: -32,
    paddingVertical: spacing.md,
    shadowColor: colors.primaryDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  body: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.tagRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FBCACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  errorBannerText: { flex: 1, fontSize: 12, color: colors.error, fontWeight: '600' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
