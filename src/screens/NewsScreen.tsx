import React from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Header } from '../components/Header';
import { AppCard } from '../components/AppCard';
import { instagramService } from '../services/instagramService';
import { News } from '../types/news';
import { AutoImage } from '../components/AutoImage';
import { ErrorState } from '../components/ErrorState';
import { openUrl } from '../utils/links';
import { useRemote } from '../hooks/useRemote';

export const NewsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  // Rechargé à chaque ouverture de l'écran : une actualité masquée ou ajoutée dans l'admin est prise en compte.
  const { data: news, loading, refreshing, error, refresh, retry } = useRemote<News[]>(
    () => instagramService.getLatestNews(),
    []
  );

  const openInstagram = (url: string) => openUrl(url);

  const renderItem = ({ item }: { item: News }) => (
    <AppCard style={styles.newsCard}>
      {item.imageUrl ? <AutoImage uri={item.imageUrl} /> : null}
      <View style={styles.newsContent}>
        <View style={styles.newsHeader}>
          <Text style={styles.newsDate}>{item.date}</Text>
          <Ionicons name="logo-instagram" size={16} color={colors.accent} />
        </View>
        <Text style={styles.newsTitle}>{item.title}</Text>
        <Text style={styles.newsDescription}>{item.description}</Text>
        <TouchableOpacity
          style={styles.instagramLink}
          onPress={() => openInstagram(item.instagramUrl)}
        >
          <Ionicons name="open-outline" size={14} color={colors.primary} />
          <Text style={styles.instagramLinkText}>Voir sur Instagram</Text>
        </TouchableOpacity>
      </View>
    </AppCard>
  );

  return (
    <View style={styles.container}>
      <Header title="Actualités" subtitle="Suivez nos dernières publications" onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Chargement des actualités...</Text>
        </View>
      ) : error && news.length === 0 ? (
        <ErrorState onRetry={retry} />
      ) : news.length > 0 ? (
        <FlatList
          data={news}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refresh}
          refreshing={refreshing}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="newspaper-outline" size={48} color={colors.textLight} />
          <Text style={styles.emptyText}>Aucune actualité pour le moment</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  newsCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  newsContent: {
    padding: spacing.md,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  newsDate: {
    fontSize: 12,
    color: colors.textLight,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  newsDescription: {
    fontSize: 13,
    color: colors.textLight,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  instagramLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  instagramLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textLight,
  },
});
