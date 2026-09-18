import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { legalService } from '../services/legalService';

export const MyDataScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const result = await legalService.exportMyData();
      setData(result);
    } catch (error: any) {
      console.error('MyDataScreen: export error', error);
      Alert.alert('Erreur', error?.message || "Impossible de générer l'export.");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!data) return;
    try {
      await Share.share({ message: JSON.stringify(data, null, 2) });
    } catch (error) {
      console.error('MyDataScreen: share error', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes données</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.infoBoxText}>
            Conformément au RGPD, tu peux consulter et exporter toutes les données personnelles que
            MIAGE Connection possède sur toi.
          </Text>
        </View>

        {!data ? (
          <TouchableOpacity style={styles.actionButton} onPress={handleExport} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="download-outline" size={16} color={colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.actionButtonText}>Générer mon export</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.jsonBox}>
              <Text style={styles.jsonText}>{JSON.stringify(data, null, 2)}</Text>
            </View>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={16} color={colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.actionButtonText}>Partager / enregistrer</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.deleteLink}
          onPress={() => navigation.navigate('AccountDeletionRequest')}
        >
          <Text style={styles.deleteLinkText}>Demander la suppression de mon compte</Text>
        </TouchableOpacity>
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
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  content: {
    padding: spacing.xl,
  },
  infoBox: {
    backgroundColor: colors.primarySoft,
    padding: spacing.lg,
    borderRadius: 20,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(14, 26, 74, 0.7)',
    lineHeight: 18,
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  jsonBox: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  jsonText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: colors.text,
  },
  deleteLink: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  deleteLinkText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '700',
  },
});
