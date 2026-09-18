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
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { domainsService, AllowedDomain, AssociationOption } from '../services/domainsService';

export const DomainsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [domains, setDomains] = useState<AllowedDomain[]>([]);
  const [associations, setAssociations] = useState<AssociationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [selectedAssoId, setSelectedAssoId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [domainsData, assosData] = await Promise.all([
        domainsService.getAllDomains(),
        domainsService.getAssociationOptions(),
      ]);
      setDomains(domainsData);
      setAssociations(assosData);
    } catch (error) {
      console.error('DomainsScreen: load error', error);
      Alert.alert('Erreur', 'Impossible de charger les domaines.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleToggleActive = async (item: AllowedDomain) => {
    try {
      await domainsService.setDomainActive(item.domain, !item.is_active);
      load();
    } catch (error) {
      console.error('DomainsScreen: toggle error', error);
      Alert.alert('Erreur', "Impossible de modifier ce domaine.");
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim() || !selectedAssoId) {
      Alert.alert('Champs manquants', 'Renseigne le domaine et choisis une association.');
      return;
    }
    setSaving(true);
    try {
      await domainsService.addDomain(newDomain, selectedAssoId, note);
      setAddModalVisible(false);
      setNewDomain('');
      setSelectedAssoId(null);
      setNote('');
      load();
    } catch (error: any) {
      console.error('DomainsScreen: add error', error);
      Alert.alert('Erreur', error?.message || "Impossible d'ajouter ce domaine.");
    } finally {
      setSaving(false);
    }
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
        <Text style={styles.headerTitle}>Domaines autorisés</Text>
        <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.addButton}>
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load();
        }}
        data={domains}
        keyExtractor={(item) => item.domain}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucun domaine pour le moment.</Text>}
        renderItem={({ item }) => (
          <View style={styles.domainCard}>
            <View style={styles.domainInfo}>
              <Text style={styles.domainName}>{item.domain}</Text>
              <Text style={styles.assoName}>{item.associations?.name || 'Association inconnue'}</Text>
              {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
            </View>
            <TouchableOpacity
              style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}
              onPress={() => handleToggleActive(item)}
            >
              <Text style={item.is_active ? styles.statusActiveText : styles.statusInactiveText}>
                {item.is_active ? 'Actif' : 'Désactivé'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={addModalVisible} transparent animationType="fade" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un domaine</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Domaine</Text>
              <TextInput
                style={styles.input}
                placeholder="exemple.fr"
                value={newDomain}
                onChangeText={setNewDomain}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Association</Text>
              <View style={styles.assoPicker}>
                {associations.map((asso) => (
                  <TouchableOpacity
                    key={asso.id}
                    style={[styles.assoOption, selectedAssoId === asso.id && styles.assoOptionSelected]}
                    onPress={() => setSelectedAssoId(asso.id)}
                  >
                    <Text
                      style={[
                        styles.assoOptionText,
                        selectedAssoId === asso.id && styles.assoOptionTextSelected,
                      ]}
                    >
                      {asso.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Note (optionnel)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: demande via email du 12/09"
                value={note}
                onChangeText={setNote}
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleAddDomain} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>Ajouter</Text>
              )}
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
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
  domainCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  domainInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  domainName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  assoName: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  note: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#E1F7EF',
  },
  statusInactive: {
    backgroundColor: '#FDECEC',
  },
  statusActiveText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
  },
  statusInactiveText: {
    color: colors.error,
    fontSize: 11,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalBody: {
    padding: spacing.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  assoPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  assoOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assoOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  assoOptionText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  assoOptionTextSelected: {
    color: colors.white,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginVertical: spacing.lg,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
