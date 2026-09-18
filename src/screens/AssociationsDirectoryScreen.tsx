import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Image,
  FlatList,
  SectionList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { associationService, Association } from '../services/associationService';

export const AssociationsDirectoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadAssociations();
  }, []);

  const loadAssociations = async () => {
    try {
      setLoading(true);
      const data = await associationService.getAllAssociations();
      setAssociations(data);
    } catch (error) {
      console.error('Error loading associations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssociations = associations.filter(asso =>
    asso.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderAssociationCard = ({ item }: { item: Association }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {item.logo_url ? (
          <Image source={{ uri: item.logo_url }} style={styles.logo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>{item.name.substring(0, 2).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.assoName}>{item.name}</Text>
          {item.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.textLight} />
              <Text style={styles.locationText}>{item.location}</Text>
            </View>
          )}
        </View>
      </View>

      {item.description && (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.statsContainer}>
        {item.members_count !== undefined && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.members_count}</Text>
            <Text style={styles.statLabel}>Adhérents</Text>
          </View>
        )}
        {item.mandate_events_count !== undefined && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.mandate_events_count}</Text>
            <Text style={styles.statLabel}>Événements</Text>
          </View>
        )}
      </View>

      <View style={styles.contactRow}>
        {item.email_contact && (
          <TouchableOpacity style={styles.contactButton}>
            <Ionicons name="mail-outline" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
        {item.website_url && (
          <TouchableOpacity style={styles.contactButton}>
            <Ionicons name="globe-outline" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
        {item.instagram_username && (
          <TouchableOpacity style={styles.contactButton}>
            <Ionicons name="logo-instagram" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
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
        <Text style={styles.title}>Annuaire des associations</Text>
        <Text style={styles.subtitle}>{filteredAssociations.length} associations</Text>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={styles.tabButtonSecondary}
          onPress={() => navigation.navigate('HubMiagistes')}
        >
          <Ionicons name="person-outline" size={16} color={colors.textLight} style={styles.tabIcon} />
          <Text style={styles.tabTextSecondary}>MIAGistes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton}>
          <Ionicons name="people-outline" size={16} color={colors.primary} style={styles.tabIcon} />
          <Text style={styles.tabText}>Associations</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une association..."
          placeholderTextColor={colors.textLight}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <FlatList
        data={filteredAssociations}
        keyExtractor={(item) => item.id}
        renderItem={renderAssociationCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>Aucune association trouvée</Text>
          </View>
        }
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textLight,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  tabTextSecondary: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textLight,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: spacing.md,
    paddingLeft: 0,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  card: {
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
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginRight: spacing.md,
    backgroundColor: colors.surface,
  },
  logoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  logoText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  headerInfo: {
    flex: 1,
  },
  assoName: {
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
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textLight,
  },
  contactRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  contactButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
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
