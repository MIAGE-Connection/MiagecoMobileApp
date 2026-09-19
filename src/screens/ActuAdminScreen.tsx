import React, { useState } from 'react';
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
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { AutoImage } from '../components/AutoImage';
import { spacing } from '../theme/spacing';
import { adminNewsService, AdminNews } from '../services/adminNewsService';
import { useRemote } from '../hooks/useRemote';
import { ErrorState } from '../components/ErrorState';
import { openUrl } from '../utils/links';

export const ActuAdminScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { data: items, loading, refreshing, error, refresh, retry } = useRemote<AdminNews[]>(
    () => adminNewsService.getAllNews(),
    []
  );
  const [selected, setSelected] = useState<AdminNews | null>(null);

  const openLink = (url?: string) => openUrl(url);

  const formatDate = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

  const renderItemCard = ({ item }: { item: AdminNews }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => setSelected(item)}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.thumb} />
      ) : (
        <View style={styles.iconContainer}>
          <Ionicons name={(item.icon_name as any) || 'newspaper-outline'} size={24} color={colors.primary} />
        </View>
      )}

      <View style={styles.itemInfo}>
        <View style={styles.headerRow}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        </View>
        <Text style={styles.description} numberOfLines={3}>{item.description}</Text>
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
          refreshing={refreshing}
          onRefresh={refresh}
          ListEmptyComponent={
            error ? (
              <ErrorState onRetry={retry} />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-outline" size={48} color={colors.textLight} />
                <Text style={styles.emptyText}>Aucune actualité</Text>
              </View>
            )
          }
        />
      )}

      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              {selected?.image_url ? <AutoImage uri={selected.image_url} style={styles.detailImage} /> : null}
              {selected?.category ? (
                <View style={[styles.categoryBadge, { alignSelf: 'flex-start' }]}>
                  <Text style={styles.categoryText}>{selected.category}</Text>
                </View>
              ) : null}
              <Text style={styles.detailTitle}>{selected?.title}</Text>
              {selected?.published_at ? (
                <Text style={styles.detailDate}>{formatDate(selected.published_at)}</Text>
              ) : null}
              <Text style={styles.detailBody} selectable>
                {selected?.description}
              </Text>
              {selected?.url ? (
                <TouchableOpacity style={styles.linkButton} onPress={() => openLink(selected.url)}>
                  <Ionicons name="open-outline" size={18} color={colors.white} style={{ marginRight: 8 }} />
                  <Text style={styles.linkButtonText}>Ouvrir le lien</Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelected(null)}>
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  thumb: { width: 50, height: 50, borderRadius: 12, marginRight: spacing.lg, backgroundColor: colors.surface },
  detailImage: { borderRadius: 14, marginBottom: spacing.md },
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
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },
  description: {
    fontSize: 12,
    color: colors.textLight,
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(14, 26, 74, 0.45)',
  },
  modalSheet: {
    maxHeight: '85%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  modalContent: {
    paddingBottom: spacing.lg,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.md,
  },
  detailDate: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
  },
  detailBody: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.text,
    marginTop: spacing.lg,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    marginTop: spacing.xl,
  },
  linkButtonText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 14,
  },
  closeButton: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.text,
    fontWeight: '700',
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
