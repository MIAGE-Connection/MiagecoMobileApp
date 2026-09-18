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
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { adminNewsService, AdminNews } from '../services/adminNewsService';

const FALLBACK_NEWS: AdminNews[] = [
  {
    id: '1',
    title: 'Plateforme d\'apprentissage MIAGE',
    description: 'Accédez aux cours et ressources pédagogiques mises à jour',
    category: 'Apprentissage',
    icon_name: 'school-outline',
    order_index: 1,
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Forum MIAGE Community',
    description: 'Discussions et échanges entre MIAGistes de la fédération',
    category: 'Communauté',
    icon_name: 'chatbubbles-outline',
    order_index: 2,
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Offres d\'emploi partenaires',
    description: 'Opportunités professionnelles pour les diplômés MIAGE',
    category: 'Carrière',
    icon_name: 'briefcase-outline',
    order_index: 3,
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const ActuAdminScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<AdminNews[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    setLoading(true);
    try {
      const data = await adminNewsService.getAllNews();
      if (data && data.length > 0) {
        setItems(data);
      } else {
        console.warn('No admin news from BD, using fallback');
        setItems(FALLBACK_NEWS);
      }
    } catch (error) {
      console.error('Error loading admin news:', error);
      setItems(FALLBACK_NEWS);
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (url?: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const renderItemCard = ({ item }: { item: AdminNews }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => handleItemPress(item.url)}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={item.icon_name as any} size={24} color={colors.primary} />
      </View>

      <View style={styles.itemInfo}>
        <View style={styles.headerRow}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        </View>
        <Text style={styles.description}>{item.description}</Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.border} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Actu Admin</Text>
        <View style={styles.spacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItemCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>Aucune actualité</Text>
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
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  itemInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.white,
  },
  description: {
    fontSize: 12,
    color: colors.textLight,
    lineHeight: 16,
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
