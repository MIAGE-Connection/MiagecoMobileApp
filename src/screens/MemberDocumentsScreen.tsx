import React from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { memberSpaceService, MemberDocument } from '../services/memberSpaceService';
import { newContentService } from '../services/newContentService';
import { useRemote } from '../hooks/useRemote';
import { ErrorState } from '../components/ErrorState';
import { openUrl } from '../utils/links';

export const MemberDocumentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { data: documents, loading, refreshing, error, refresh, retry } = useRemote<MemberDocument[]>(async () => {
    const data = await memberSpaceService.getDocuments();
    newContentService.markSeen('member_documents');
    return data;
  }, []);

  const openDocument = (fileUrl: string) => openUrl(fileUrl);

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
        <Text style={styles.headerTitle}>Documents</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={refresh}
        ListEmptyComponent={
          error ? <ErrorState onRetry={retry} /> : <Text style={styles.emptyText}>Aucun document pour le moment.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.docCard} onPress={() => openDocument(item.file_url)}>
            <View style={styles.docIconBox}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docTitle}>{item.title}</Text>
              {item.description ? <Text style={styles.docDescription}>{item.description}</Text> : null}
              {item.category ? <Text style={styles.docCategory}>{item.category}</Text> : null}
            </View>
            <Ionicons name="download-outline" size={18} color={colors.textLight} />
          </TouchableOpacity>
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
    width: 44,
    height: 44,
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
  docCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  docIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  docDescription: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  docCategory: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
  },
});
