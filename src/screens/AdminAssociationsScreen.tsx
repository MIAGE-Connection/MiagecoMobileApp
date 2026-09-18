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
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { associationService, Association } from '../services/associationService';
import { membersService, ReferentInfo } from '../services/membersService';

type AdminAssociation = Pick<Association, 'id' | 'name' | 'location' | 'is_published'>;

export const AdminAssociationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [associations, setAssociations] = useState<AdminAssociation[]>([]);
  const [referentsByAsso, setReferentsByAsso] = useState<Record<string, ReferentInfo>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [publish, setPublish] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [assosData, referentsData] = await Promise.all([
        associationService.listForAdmin(),
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
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openForm = () => {
    setName('');
    setLocation('');
    setEmail('');
    setPublish(true);
    setFormOpen(true);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Nom requis', "Renseigne le nom de l'association.");
      return;
    }
    setSaving(true);
    try {
      await associationService.createAssociation({
        name,
        location,
        email_contact: email,
        is_published: publish,
      });
      setFormOpen(false);
      await load();
      Alert.alert(
        'Association créée',
        'Pense à lui rattacher son domaine email (Domaines) pour que ses adhérents puissent se connecter, puis à nommer son référent.'
      );
    } catch (error: any) {
      console.error('AdminAssociationsScreen: create error', error);
      Alert.alert('Erreur', error?.message || "Impossible de créer l'association.");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublished = async (id: string, value: boolean) => {
    setAssociations((prev) => prev.map((a) => (a.id === id ? { ...a, is_published: value } : a)));
    try {
      await associationService.updateAssociation(id, { is_published: value });
    } catch (error) {
      console.error('AdminAssociationsScreen: publish error', error);
      setAssociations((prev) => prev.map((a) => (a.id === id ? { ...a, is_published: !value } : a)));
      Alert.alert('Erreur', 'Impossible de modifier la visibilité.');
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
        <Text style={styles.headerTitle}>Associations</Text>
        <TouchableOpacity onPress={openForm} style={styles.addButton} accessibilityLabel="Ajouter une association">
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load();
        }}
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
                <View style={styles.publishRow}>
                  <Switch
                    value={!!item.is_published}
                    onValueChange={(v) => handleTogglePublished(item.id, v)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.white}
                  />
                  <Text style={styles.publishText}>
                    {item.is_published ? 'Visible dans l’annuaire' : 'Masquée'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.border} />
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Nouvelle association</Text>

            <Text style={styles.label}>Nom *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex : MIAGE Connection Lyon"
              placeholderTextColor={colors.textLight}
            />

            <Text style={styles.label}>Ville</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Ex : Lyon"
              placeholderTextColor={colors.textLight}
            />

            <Text style={styles.label}>Email de contact</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="contact@asso.fr"
              placeholderTextColor={colors.textLight}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={styles.publishRowModal}>
              <Switch
                value={publish}
                onValueChange={setPublish}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
              <Text style={styles.publishText}>Visible dans l’annuaire public</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setFormOpen(false)} disabled={saving}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleCreate} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.saveText}>Créer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
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
  publishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  publishRowModal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  publishText: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(14, 26, 74, 0.45)',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textLight,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    color: colors.text,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    color: colors.white,
    fontWeight: '800',
  },
});
