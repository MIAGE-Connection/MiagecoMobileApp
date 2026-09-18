import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Header } from '../components/Header';
import { AppCard } from '../components/AppCard';
import { MIAGiste } from '../types/miagiste';
import { miagisteService } from '../services/miagisteService';

export const HubMiagistesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [miagistes, setMiagistes] = useState<MIAGiste[]>([]);
  const [filteredMiagistes, setFilteredMiagistes] = useState<MIAGiste[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMiagistes();
  }, []);

  const loadMiagistes = async () => {
    setLoading(true);
    try {
      const data = await miagisteService.fetchMiagistes();
      setMiagistes(data);
      setFilteredMiagistes(data);
    } catch (error) {
      console.error('Erreur lors du chargement des MIAGistes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    filterMiagistes(searchQuery);
  }, [searchQuery, miagistes]);

  const filterMiagistes = (query: string) => {
    if (query.trim() === '') {
      setFilteredMiagistes(miagistes);
    } else {
      const filtered = miagistes.filter(
        (m) =>
          m.fullName.toLowerCase().includes(query.toLowerCase()) ||
          m.associationName.toLowerCase().includes(query.toLowerCase()) ||
          m.specialization?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredMiagistes(filtered);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: { [key: string]: string } = {
      admin: 'Admin',
      member: 'Membre',
      alumni: 'Alumni',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const roleColors: { [key: string]: string } = {
      admin: colors.accent,
      member: colors.highlight,
      alumni: colors.success,
    };
    return roleColors[role] || colors.primary;
  };

  const renderMiagiste = ({ item }: { item: MIAGiste }) => (
    <AppCard style={styles.miagiteCard}>
      <View style={styles.cardContent}>
        <View style={[styles.profileImage, { backgroundColor: colors.surface }]}>
          <Ionicons name="person-circle" size={50} color={colors.primary} />
        </View>
        <View style={styles.miagiteInfo}>
          <Text style={styles.miagiteName}>{item.fullName}</Text>
          <Text style={styles.associationName}>{item.associationName}</Text>
          {item.specialization && (
            <Text style={styles.specialization}>{item.specialization}</Text>
          )}
          <View style={styles.emailContainer}>
            <Ionicons name="mail-outline" size={14} color={colors.textLight} style={{ marginRight: 4 }} />
            <Text style={styles.emailText} numberOfLines={1}>{item.email}</Text>
          </View>
          <View style={styles.roleContainer}>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: getRoleColor(item.role) + '20' },
              ]}
            >
              <Text
                style={[styles.roleText, { color: getRoleColor(item.role) }]}
              >
                {getRoleLabel(item.role)}
              </Text>
            </View>
            {item.graduationYear && (
              <Text style={styles.yearText}>Promo {item.graduationYear}</Text>
            )}
          </View>
        </View>
      </View>
    </AppCard>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Hub MIAGistes"
        subtitle="Réseau des étudiants et diplômés MIAGE"
      />

      <View style={styles.tabsContainer}>
        <TouchableOpacity style={styles.tabButton}>
          <Ionicons name="person-outline" size={16} color={colors.primary} style={styles.tabIcon} />
          <Text style={styles.tabText}>MIAGistes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButtonSecondary}
          onPress={() => navigation.navigate('AssociationsDirectory')}
        >
          <Ionicons name="people-outline" size={16} color={colors.textLight} style={styles.tabIcon} />
          <Text style={styles.tabTextSecondary}>Associations</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un MIAGiste..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textLight}
        />
      </View>
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredMiagistes}
          renderItem={renderMiagiste}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="person-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>Aucun MIAGiste trouvé</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    height: 44,
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  miagiteCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  miagiteInfo: {
    flex: 1,
  },
  miagiteName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  associationName: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 4,
  },
  specialization: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 13,
    color: colors.textLight,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  yearText: {
    fontSize: 11,
    color: colors.textLight,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textLight,
    marginTop: spacing.md,
  },
});
