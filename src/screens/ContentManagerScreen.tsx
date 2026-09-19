import React, { useCallback, useState } from 'react';
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
  Switch,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { contentAdminService, ContentRow, ContentTable } from '../services/contentAdminService';
import { useAuth } from '../contexts/AuthContext';

type FieldKind = 'text' | 'multiline' | 'number' | 'url' | 'date' | 'datetime' | 'choice' | 'switch';

interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

interface ContentConfig {
  table: ContentTable;
  title: string;
  emptyText: string;
  orderColumn: string;
  ascending: boolean;
  exclusivePublished?: boolean;
  // Colonne reliant le contenu à une association (le référent ne gère que la sienne).
  scopeColumn?: string;
  // false = la table n'a pas de colonne updated_at / is_published.
  hasUpdatedAt?: boolean;
  publishable?: boolean;
  trackAuthor?: boolean;
  // Valeurs imposées à chaque enregistrement (non modifiables dans le formulaire).
  fixedValues?: Record<string, unknown>;
  fields: FieldDef[];
  defaults: (rows: ContentRow[]) => Record<string, any>;
  itemTitle: (row: ContentRow) => string;
  itemSubtitle: (row: ContentRow) => string;
  isPast?: (row: ContentRow) => boolean;
}

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('fr-FR') : '';

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  return `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
};

const toDateOnly = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const CONFIGS: Record<ContentTable, ContentConfig> = {
  events: {
    table: 'events',
    scopeColumn: 'association_id',
    fixedValues: { visibility: 'public' },
    title: 'Événements',
    emptyText: 'Aucun événement pour le moment.',
    orderColumn: 'start_date',
    ascending: false,
    fields: [
      { key: 'title', label: 'Titre', kind: 'text', required: true, placeholder: 'Ex: Soirée de rentrée nationale' },
      { key: 'description', label: 'Description', kind: 'multiline', placeholder: "Détails de l'événement..." },
      { key: 'location', label: 'Lieu', kind: 'text', placeholder: 'Ex: Paris' },
      { key: 'start_date', label: 'Début', kind: 'datetime', required: true },
      { key: 'end_date', label: 'Fin (optionnel)', kind: 'datetime' },
      { key: 'is_published', label: 'Publié', kind: 'switch' },
    ],
    defaults: () => {
      const start = new Date();
      start.setDate(start.getDate() + 1);
      start.setHours(18, 0, 0, 0);
      return { is_published: true, start_date: start.toISOString() };
    },
    itemTitle: (row) => row.title,
    itemSubtitle: (row) =>
      `${formatDateTime(row.start_date)}${row.location ? ` · ${row.location}` : ''}`,
    isPast: (row) => new Date(row.start_date).getTime() < Date.now(),
  },
  news: {
    table: 'news',
    hasUpdatedAt: false,
    title: 'Actualités',
    emptyText: 'Aucune actualité pour le moment.',
    orderColumn: 'created_at',
    ascending: false,
    fields: [
      { key: 'title', label: 'Titre', kind: 'text', required: true, placeholder: 'Ex: Retour sur le congrès 2026' },
      { key: 'description', label: 'Texte', kind: 'multiline', placeholder: "Légende du post, texte de l'actualité..." },
      { key: 'image_url', label: 'Image (lien, optionnel)', kind: 'url', placeholder: 'https://.../image.jpg' },
      { key: 'instagram_url', label: 'Lien du post Instagram (optionnel)', kind: 'url', placeholder: 'https://www.instagram.com/p/...' },
      { key: 'is_published', label: 'Publié', kind: 'switch' },
    ],
    defaults: () => ({ is_published: true }),
    itemTitle: (row) => row.title,
    itemSubtitle: (row) => `${formatDate(row.created_at)}${row.instagram_url ? ' · Instagram' : ''}`,
  },
  admin_news: {
    table: 'admin_news',
    title: 'Actu Admin',
    emptyText: 'Aucune actualité pour le moment.',
    orderColumn: 'order_index',
    ascending: true,
    fields: [
      { key: 'title', label: 'Titre', kind: 'text', required: true, placeholder: 'Ex: Nouveau bureau national' },
      { key: 'description', label: 'Contenu', kind: 'multiline', required: true, placeholder: "Texte de l'actualité..." },
      { key: 'category', label: 'Catégorie', kind: 'text', placeholder: 'Ex: Fédération' },
      { key: 'url', label: 'Lien (optionnel)', kind: 'url', placeholder: 'https://...' },
      { key: 'image_url', label: 'Image (lien, optionnel)', kind: 'url', placeholder: 'https://.../image.jpg' },
      { key: 'order_index', label: "Ordre d'affichage (0 = en premier)", kind: 'number' },
      { key: 'is_published', label: 'Publié', kind: 'switch' },
    ],
    defaults: (rows) => ({ is_published: true, order_index: String(rows.length) }),
    itemTitle: (row) => row.title,
    itemSubtitle: (row) => `${row.category || 'Sans catégorie'} · ordre ${row.order_index ?? 0}`,
  },
  member_documents: {
    table: 'member_documents',
    scopeColumn: 'asso_id',
    publishable: false,
    trackAuthor: true,
    title: 'Documents',
    emptyText: 'Aucun document pour le moment.',
    orderColumn: 'created_at',
    ascending: false,
    fields: [
      { key: 'title', label: 'Titre', kind: 'text', required: true, placeholder: 'Ex: Compte rendu du bureau' },
      { key: 'file_url', label: 'Lien du document (Drive, PDF...)', kind: 'url', required: true, placeholder: 'https://...' },
      { key: 'category', label: 'Catégorie', kind: 'text', placeholder: 'Ex: Comptes rendus' },
      { key: 'description', label: 'Description', kind: 'multiline' },
    ],
    defaults: () => ({}),
    itemTitle: (row) => row.title,
    itemSubtitle: (row) =>
      `${row.category || 'Sans catégorie'} · ${row.asso_id ? 'Mon association' : 'Toute la fédération'}`,
  },
  featured_events: {
    table: 'featured_events',
    title: 'Événement à la une',
    emptyText: "Aucun événement à la une. L'accueil affiche l'événement par défaut.",
    orderColumn: 'created_at',
    ascending: false,
    exclusivePublished: true,
    fields: [
      { key: 'title', label: 'Titre', kind: 'text', required: true, placeholder: 'Ex: Congrès National MIAGE 2026' },
      { key: 'description', label: 'Description', kind: 'multiline' },
      { key: 'start_date', label: 'Date de début', kind: 'date' },
      { key: 'end_date', label: 'Date de fin', kind: 'date' },
      { key: 'location', label: 'Lieu', kind: 'text', placeholder: 'Ex: Marseille' },
      { key: 'stats', label: 'Ligne de chiffres', kind: 'text', placeholder: 'Ex: 600 MIAGistes attendus' },
      { key: 'ticket_url', label: 'Lien du bouton « S\'inscrire »', kind: 'url', placeholder: 'https://...' },
      { key: 'program_url', label: 'Lien du bouton « Programme » (optionnel)', kind: 'url', placeholder: 'https://...' },
      { key: 'is_published', label: "Afficher à l'accueil", kind: 'switch' },
    ],
    defaults: () => ({ is_published: true }),
    itemTitle: (row) => row.title,
    itemSubtitle: (row) =>
      `${formatDate(row.start_date) || 'Date à définir'}${row.location ? ` · ${row.location}` : ''}`,
  },
};

export const ContentManagerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const config = CONFIGS[(route.params?.type as ContentTable) || 'events'];
  const { user } = useAuth();
  // Un référent ne voit et ne crée que les contenus de sa propre association.
  const scopeValue = user?.role === 'admin_association' && config.scopeColumn ? user.associationId : null;
  const publishable = config.publishable !== false;

  const [rows, setRows] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<{ key: string; mode: 'date' | 'time' } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await contentAdminService.list(
        config.table,
        config.orderColumn,
        config.ascending,
        scopeValue && config.scopeColumn ? { column: config.scopeColumn, value: scopeValue } : undefined
      );
      setRows(data);
    } catch (error) {
      console.error('ContentManagerScreen: load error', error);
      Alert.alert('Erreur', 'Impossible de charger les contenus.');
    } finally {
      setLoading(false);
    }
  }, [config, scopeValue]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(config.defaults(rows));
    setModalVisible(true);
  };

  const openEdit = (row: ContentRow) => {
    const values: Record<string, any> = {};
    config.fields.forEach((field) => {
      const raw = row[field.key];
      values[field.key] = field.kind === 'number' ? (raw == null ? '' : String(raw)) : raw ?? (field.kind === 'switch' ? false : '');
    });
    setEditingId(row.id);
    setForm(values);
    setModalVisible(true);
  };

  const setField = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const handlePickerChange = (selected?: Date) => {
    if (!picker) return;
    const { key, mode } = picker;
    setPicker(null);
    if (!selected) return;
    const current = form[key] ? new Date(form[key]) : new Date();
    const field = config.fields.find((f) => f.key === key);
    if (field?.kind === 'date') {
      setField(key, toDateOnly(selected));
      return;
    }
    if (mode === 'date') {
      current.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    } else {
      current.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    }
    setField(key, current.toISOString());
  };

  const handleSave = async () => {
    const payload: Record<string, unknown> = {};
    for (const field of config.fields) {
      const value = form[field.key];
      if (field.kind === 'switch') {
        payload[field.key] = Boolean(value);
      } else if (field.kind === 'number') {
        payload[field.key] = value === '' || value == null ? 0 : parseInt(String(value), 10) || 0;
      } else {
        const trimmed = typeof value === 'string' ? value.trim() : value;
        if (field.required && !trimmed) {
          Alert.alert('Champ manquant', `Renseigne : ${field.label}.`);
          return;
        }
        payload[field.key] = trimmed ? trimmed : null;
      }
    }
    if (config.fixedValues) Object.assign(payload, config.fixedValues);
    if (config.hasUpdatedAt !== false) payload.updated_at = new Date().toISOString();
    if (scopeValue && config.scopeColumn) payload[config.scopeColumn] = scopeValue;
    if (config.trackAuthor && !editingId && user) payload.created_by = user.id;

    setSaving(true);
    try {
      const id = await contentAdminService.save(config.table, editingId, payload);
      if (config.exclusivePublished && payload.is_published) {
        await contentAdminService.unpublishOthers(config.table, id);
      }
      setModalVisible(false);
      load();
    } catch (error: any) {
      console.error('ContentManagerScreen: save error', error);
      Alert.alert('Erreur', error?.message || "Impossible d'enregistrer.");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublished = async (row: ContentRow) => {
    try {
      await contentAdminService.setPublished(config.table, row.id, !row.is_published);
      if (config.exclusivePublished && !row.is_published) {
        await contentAdminService.unpublishOthers(config.table, row.id);
      }
      load();
    } catch (error) {
      console.error('ContentManagerScreen: toggle error', error);
      Alert.alert('Erreur', 'Impossible de modifier la publication.');
    }
  };

  const handleDelete = (row: ContentRow) => {
    Alert.alert('Supprimer', `Supprimer « ${config.itemTitle(row)} » ? Cette action est définitive.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await contentAdminService.remove(config.table, row.id);
            load();
          } catch (error) {
            console.error('ContentManagerScreen: delete error', error);
            Alert.alert('Erreur', 'Impossible de supprimer.');
          }
        },
      },
    ]);
  };

  const renderField = (field: FieldDef) => {
    const value = form[field.key];

    if (field.kind === 'switch') {
      return (
        <View key={field.key} style={styles.switchRow}>
          <Text style={styles.label}>{field.label}</Text>
          <Switch
            value={Boolean(value)}
            onValueChange={(v) => setField(field.key, v)}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      );
    }

    if (field.kind === 'choice') {
      return (
        <View key={field.key} style={styles.fieldGroup}>
          <Text style={styles.label}>{field.label}</Text>
          <View style={styles.choiceRow}>
            {field.options?.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.choice, value === option.value && styles.choiceSelected]}
                onPress={() => setField(field.key, option.value)}
              >
                <Text style={[styles.choiceText, value === option.value && styles.choiceTextSelected]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    if (field.kind === 'date' || field.kind === 'datetime') {
      const hasValue = Boolean(value);
      return (
        <View key={field.key} style={styles.fieldGroup}>
          <Text style={styles.label}>{field.label}</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateButton} onPress={() => setPicker({ key: field.key, mode: 'date' })}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.dateButtonText}>{hasValue ? formatDate(value) : 'Choisir'}</Text>
            </TouchableOpacity>
            {field.kind === 'datetime' && (
              <TouchableOpacity style={styles.dateButton} onPress={() => setPicker({ key: field.key, mode: 'time' })}>
                <Ionicons name="time-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.dateButtonText}>
                  {hasValue
                    ? new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    : 'Heure'}
                </Text>
              </TouchableOpacity>
            )}
            {!field.required && hasValue && (
              <TouchableOpacity style={styles.clearButton} onPress={() => setField(field.key, null)}>
                <Ionicons name="close-circle" size={22} color={colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    return (
      <View key={field.key} style={styles.fieldGroup}>
        <Text style={styles.label}>{field.label}</Text>
        <TextInput
          style={[styles.input, field.kind === 'multiline' && styles.textArea]}
          placeholder={field.placeholder}
          value={value == null ? '' : String(value)}
          onChangeText={(text) => setField(field.key, text)}
          multiline={field.kind === 'multiline'}
          keyboardType={field.kind === 'number' ? 'number-pad' : field.kind === 'url' ? 'url' : 'default'}
          autoCapitalize={field.kind === 'url' ? 'none' : 'sentences'}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const pickerField = picker ? config.fields.find((f) => f.key === picker.key) : null;
  const pickerValue = picker && form[picker.key] ? new Date(form[picker.key]) : new Date();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{config.title}</Text>
        <TouchableOpacity onPress={openCreate} style={styles.addButton}>
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await load();
          setRefreshing(false);
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>{config.emptyText}</Text>}
        renderItem={({ item }) => {
          const past = config.isPast?.(item);
          return (
            <TouchableOpacity
              style={[styles.card, past && styles.cardPast]}
              onPress={() => openEdit(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {config.itemTitle(item)}
                </Text>
                <Text style={styles.cardSubtitle} numberOfLines={2}>
                  {config.itemSubtitle(item)}
                </Text>
                <View style={styles.badgeRow}>
                  {publishable && (
                    <View style={[styles.badge, item.is_published ? styles.badgeOn : styles.badgeOff]}>
                      <Text style={[styles.badgeText, { color: item.is_published ? colors.success : colors.textLight }]}>
                        {item.is_published ? 'Publié' : 'Brouillon'}
                      </Text>
                    </View>
                  )}
                  {past && (
                    <View style={[styles.badge, styles.badgeOff]}>
                      <Text style={[styles.badgeText, { color: colors.textLight }]}>Passé</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.cardActions}>
                {publishable && (
                  <Switch
                    value={Boolean(item.is_published)}
                    onValueChange={() => handleTogglePublished(item)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                )}
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrapper}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingId ? 'Modifier' : 'Ajouter'} · {config.title}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                {config.fields.map(renderField)}

                {picker && (
                  <DateTimePicker
                    value={pickerValue}
                    mode={pickerField?.kind === 'date' ? 'date' : picker.mode}
                    is24Hour
                    onChange={(_, selected) => handlePickerChange(selected)}
                  />
                )}
              </ScrollView>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveButtonText}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
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
    paddingTop: spacing.sm,
    paddingBottom: 100,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textLight,
    marginTop: spacing.xl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardPast: {
    opacity: 0.6,
  },
  cardInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeOn: {
    backgroundColor: '#E1F7EF',
  },
  badgeOff: {
    backgroundColor: colors.primarySoft,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardActions: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deleteButton: {
    marginTop: spacing.sm,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    maxHeight: '92%',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexShrink: 1,
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
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: spacing.md,
  },
  modalBody: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    flexShrink: 1,
  },
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
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
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  choice: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  choiceSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  choiceTextSelected: {
    color: colors.white,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: spacing.md,
  },
  dateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  clearButton: {
    padding: 2,
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
