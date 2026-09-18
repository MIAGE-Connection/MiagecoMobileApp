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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { domainsService, AssociationOption } from '../services/domainsService';
import { membersService, ReferentInfo } from '../services/membersService';

export const AdminAssociationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [associations, setAssociations] = useState<AssociationOption[]>([]);
  const [referentsByAsso, setReferentsByAsso] = useState<Record<string, ReferentInfo>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [assosData, referentsData] = await Promise.all([
        domainsService.getAssociationOptions(),
        membersService.getAllReferents(),
      ]);
      setAssociations(assosData);
      const map: Record<string, ReferentInfo> = {};
      referentsData.forEach((r) => {
        map[r.association_id] = r;
      });
      setReferentsByAsso(map);
    } catch (error) {
      console.error('AdminAssociationsScreen: load error', error);
      Alert.alert('Erreur', 'Impossible de charger les associations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Associations</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={associations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucune association pour le moment.</Text>}
        renderItem={({ item }) => {
          const referent = referentsByAsso[item.id];
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate('Members', { associationId: item.id, associationName: item.name })
              }
            >
              <View style={styles.cardInfo}>
                <Text style={styles.assoName}>{item.name}</Text>
                <Text style={styles.referentText}>
                  {referent ? `Référent : ${referent.full_name || referent.email}` : 'Aucun référent désigné'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.border} />
            </TouchableOpacity>
          );
        }}
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
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  assoName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  referentText: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
  },
});
