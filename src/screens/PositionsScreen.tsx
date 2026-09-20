import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { positionsService, MemberPosition } from '../services/positionsService';
import { POSITION_COLORS } from '../data/positionColors';
import { useRemote } from '../hooks/useRemote';
import { ErrorState } from '../components/ErrorState';
import { PositionBadge } from '../components/PositionBadge';

interface PositionsData {
  positions: MemberPosition[];
  usage: Record<string, number>;
}

// Super admin : liste des postes que les adhérents peuvent choisir dans « Mon profil ».
// Chaque poste a une couleur propre (badge dans l'annuaire).
export const PositionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { data, setData, loading, refreshing, error, refresh, retry, reload } = useRemote<PositionsData>(
    async () => {
      const [positions, usage] = await Promise.all([positionsService.getAll(), positionsService.getUsage()]);
      return { positions, usage };
    },
    { positions: [], usage: {} }
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MemberPosition | null>(null);
  const [label, setLabel] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Couleurs déjà prises par un autre poste (le serveur refuse les doublons).
  const takenColors = useMemo(() => {
    const taken = new Set<string>();
    data.positions.forEach((p) => {
      if (p.id !== editing?.id) taken.add(p.color.toUpperCase());
    });
    return taken;
  }, [data.positions, editing]);

  const openCreate = () => {
    setEditing(null);
    setLabel('');
    setColor(POSITION_COLORS.find((c) => !data.positions.some((p) => p.color.toUpperCase() === c.hex))?.hex ?? null);
    setActive(true);
    setModalOpen(true);
  };

  const openEdit = (position: MemberPosition) => {
    setEditing(position);
    setLabel(position.label);
    setColor(position.color);
    setActive(position.is_active);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (label.trim().length < 2) {
      Alert.alert('Nom trop court', 'Donne un nom d\'au moins 2 caractères.');
      return;
    }
    if (!color) {
      Alert.alert('Couleur manquante', 'Choisis une couleur pour le badge.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await positionsService.update(editing.id, { label, color, is_active: active });
      } else {
        const next = data.positions.reduce((max, p) => Math.max(max, p.sort_order), 0) + 10;
        await positionsService.create(label, color, next);
      }
      setModalOpen(false);
      await reload();
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || "Impossible d'enregistrer ce poste.");
    } finally {
      setSaving(false);
    }
  };

  // Monte / descend un poste : la liste s'affiche tout de suite dans le nouvel ordre, puis est enregistrée.
  const handleMove = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= data.positions.length) return;
    const reordered = [...data.positions];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setData((current) => ({ ...current, positions: reordered }));
    try {
      await positionsService.reorder(reordered.map((p) => p.id));
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || "Impossible d'enregistrer le nouvel ordre.");
      await reload();
    }
  };

  const handleToggle = async (position: MemberPosition) => {
    try {
      await positionsService.update(position.id, { is_active: !position.is_active });
      await reload();
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de modifier ce poste.');
    }
  };

  const handleDelete = (position: MemberPosition) => {
    const count = data.usage[position.id] || 0;
    Alert.alert(
      `Supprimer « ${position.label} » ?`,
      count > 0
        ? `${count} adhérent${count > 1 ? 's ont' : ' a'} ce poste : ${count > 1 ? 'ils se retrouveront' : 'il se retrouvera'} sans poste. Pour le retirer sans rien perdre, désactive-le plutôt.`
        : 'Aucun adhérent n\'a ce poste.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await positionsService.remove(position.id);
              await reload();
            } catch (e: any) {
              Alert.alert('Erreur', e?.message || 'Impossible de supprimer ce poste.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Postes des adhérents</Text>
        <TouchableOpacity onPress={openCreate} style={styles.iconButton} accessibilityLabel="Ajouter un poste">
          <Ionicons name="add-circle" size={30} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={data.positions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={refresh}
        ListHeaderComponent={
          <Text style={styles.intro}>
            Les adhérents choisissent leur poste dans cette liste ; il s'affiche sous forme de badge coloré dans
            l'annuaire. Les flèches règlent l'ordre dans lequel les postes sont proposés. Un poste désactivé n'est plus proposé mais reste affiché chez ceux qui l'ont.
          </Text>
        }
        ListEmptyComponent={
          error ? <ErrorState onRetry={retry} /> : <Text style={styles.empty}>Aucun poste. Ajoute-en un avec le +.</Text>
        }
        renderItem={({ item, index }) => {
          const count = data.usage[item.id] || 0;
          return (
            <View style={[styles.card, !item.is_active && styles.cardInactive]}>
              <View style={styles.orderButtons}>
                <TouchableOpacity
                  onPress={() => handleMove(index, -1)}
                  disabled={index === 0}
                  style={styles.orderButton}
                  accessibilityLabel={`Monter ${item.label}`}
                >
                  <Ionicons name="chevron-up" size={20} color={index === 0 ? colors.border : colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleMove(index, 1)}
                  disabled={index === data.positions.length - 1}
                  style={styles.orderButton}
                  accessibilityLabel={`Descendre ${item.label}`}
                >
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={index === data.positions.length - 1 ? colors.border : colors.primary}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.cardInfo}>
                <PositionBadge label={item.label} color={item.color} style={{ marginTop: 0 }} />
                <Text style={styles.cardMeta}>
                  {count} adhérent{count > 1 ? 's' : ''}
                  {item.is_active ? '' : ' · désactivé'}
                </Text>
              </View>
              <Switch
                value={item.is_active}
                onValueChange={() => handleToggle(item)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
                accessibilityLabel={`Poste ${item.label} actif`}
              />
              <TouchableOpacity onPress={() => openEdit(item)} style={styles.cardButton} accessibilityLabel="Modifier">
                <Ionicons name="pencil" size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.cardButton} accessibilityLabel="Supprimer">
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          );
        }}
      />

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={styles.modal}
            contentContainerStyle={{ padding: spacing.xl }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Modifier le poste' : 'Nouveau poste'}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} accessibilityLabel="Fermer">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Nom du poste</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Ex : Responsable partenariats"
              placeholderTextColor={colors.textLight}
              maxLength={40}
            />

            <Text style={styles.label}>Couleur du badge</Text>
            <View style={styles.palette}>
              {POSITION_COLORS.map((c) => {
                const taken = takenColors.has(c.hex.toUpperCase());
                const selected = color?.toUpperCase() === c.hex.toUpperCase();
                return (
                  <TouchableOpacity
                    key={c.hex}
                    style={[styles.swatch, { backgroundColor: c.hex }, taken && styles.swatchTaken, selected && styles.swatchSelected]}
                    onPress={() => setColor(c.hex)}
                    disabled={taken}
                    accessibilityLabel={`${c.name}${taken ? ', déjà utilisée' : ''}`}
                    accessibilityState={{ selected, disabled: taken }}
                  >
                    {selected ? <Ionicons name="checkmark" size={20} color={colors.white} /> : null}
                    {taken ? <Ionicons name="lock-closed" size={14} color={colors.white} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.hint}>Une couleur par poste : les couleurs cadenassées sont déjà prises.</Text>

            {editing ? (
              <View style={styles.activeRow}>
                <Text style={styles.activeLabel}>Proposé aux adhérents</Text>
                <Switch
                  value={active}
                  onValueChange={setActive}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.white}
                />
              </View>
            ) : null}

            <Text style={styles.label}>Aperçu</Text>
            <PositionBadge label={label.trim() || 'Nom du poste'} color={color} style={{ marginTop: 0 }} />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>Enregistrer</Text>}
            </TouchableOpacity>
          </ScrollView>
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
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  list: { padding: spacing.xl, paddingTop: 0, paddingBottom: spacing.xxl },
  intro: { fontSize: 12, lineHeight: 18, color: colors.textLight, marginBottom: spacing.lg },
  empty: { textAlign: 'center', color: colors.textLight, marginTop: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cardInactive: { opacity: 0.6 },
  orderButtons: { marginRight: 2 },
  orderButton: { width: 32, height: 26, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardMeta: { fontSize: 12, color: colors.textLight, marginTop: 6 },
  cardButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(14,26,74,0.5)', justifyContent: 'center', padding: spacing.xl },
  modal: { backgroundColor: colors.white, borderRadius: 20, flexGrow: 0, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  label: { fontSize: 12, fontWeight: '700', color: colors.textLight, marginTop: spacing.lg, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
  },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'transparent' },
  swatchTaken: { opacity: 0.3 },
  swatchSelected: { borderColor: colors.ink },
  hint: { fontSize: 12, color: colors.textLight, marginTop: spacing.sm },
  activeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg },
  activeLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  saveButton: {
    marginTop: spacing.xl,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});
