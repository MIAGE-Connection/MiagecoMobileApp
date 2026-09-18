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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { memberSpaceService, MemberDocument } from '../services/memberSpaceService';

export const MemberDocumentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [documents, setDocuments] = useState<MemberDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await memberSpaceService.getDocuments();
      setDocuments(data);
    } catch (error) {
      console.error('MemberDocumentsScreen: load error', error);
      Alert.alert('Erreur', 'Impossible de charger les documents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openDocument = (fileUrl: string) => {
    Linking.openURL(fileUrl).catch(() => {
      Alert.alert('Erreur', "Impossible d'ouvrir ce document.");
    });
  };

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
        ListEmptyComponent={<Text style={styles.emptyText}>Aucun document pour le moment.</Text>}
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
    backgroundColor: '#F1F3FE',
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
    fontSize: 10,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
  },
});
