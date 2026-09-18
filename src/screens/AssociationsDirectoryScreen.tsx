import React, { useState } from 'react';
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
import { useRemote } from '../hooks/useRemote';
import { ErrorState } from '../components/ErrorState';
import { DetailSheet, SheetAction, sheetStyles } from '../components/DetailSheet';
import { openUrl, openMail, openInstagram } from '../utils/links';

export const AssociationsDirectoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { data: associations, loading, refreshing, error, refresh, retry } = useRemote<Association[]>(
    () => associationService.getAllAssociations(),
    []
  );
  const [searchText, setSearchText] = useState('');
  const [selected, setSelected] = useState<Association | null>(null);

  const filteredAssociations = associations.filter(asso =>
    asso.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderAssociationCard = ({ item }: { item: Association }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.85}>
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
          <TouchableOpacity style={styles.contactButton} onPress={() => openMail(item.email_contact)} accessibilityLabel="Envoyer un email">
            <Ionicons name="mail-outline" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
        {item.website_url && (
          <TouchableOpacity style={styles.contactButton} onPress={() => openUrl(item.website_url)} accessibilityLabel="Ouvrir le site web">
            <Ionicons name="globe-outline" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
        {item.instagram_username && (
          <TouchableOpacity style={styles.contactButton} onPress={() => openInstagram(item.instagram_username)} accessibilityLabel="Ouvrir Instagram">
            <Ionicons name="logo-instagram" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
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
        refreshing={refreshing}
        onRefresh={refresh}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          error ? (
            <ErrorState onRetry={retry} />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>Aucune association trouvée</Text>
            </View>
          )
        }
      />

      <DetailSheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <Text style={sheetStyles.title}>{selected.name}</Text>
            {selected.location || selected.city ? (
              <Text style={sheetStyles.meta}>📍 {selected.location || selected.city}</Text>
            ) : null}
            {selected.description ? (
              <Text style={sheetStyles.body} selectable>
                {selected.description}
              </Text>
            ) : null}
            {selected.address ? <Text style={sheetStyles.meta}>{selected.address}</Text> : null}
            {selected.email_contact || selected.email ? (
              <SheetAction label="Envoyer un email" onPress={() => openMail(selected.email_contact || selected.email)} />
            ) : null}
            {selected.phone ? <SheetAction label={`Appeler ${selected.phone}`} onPress={() => openUrl(`tel:${selected.phone}`)} /> : null}
            {selected.website_url ? <SheetAction label="Site web" onPress={() => openUrl(selected.website_url)} /> : null}
            {selected.instagram_username ? (
              <SheetAction label="Instagram" onPress={() => openInstagram(selected.instagram_username)} />
            ) : null}
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
    fontSize: 11,
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
