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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import {
  scheduledNotificationService,
  ScheduledNotification,
  NotificationRecurrence,
} from '../services/scheduledNotificationService';

const RECURRENCE_LABELS: Record<NotificationRecurrence, string> = {
  once: 'Une fois',
  weekly: 'Toutes les semaines',
  biweekly: 'Toutes les 2 semaines',
};

const RECURRENCE_OPTIONS: NotificationRecurrence[] = ['once', 'weekly', 'biweekly'];

export const ScheduledNotificationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<ScheduledNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sendAt, setSendAt] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [recurrence, setRecurrence] = useState<NotificationRecurrence>('once');
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await scheduledNotificationService.list();
      setItems(data);
    } catch (error) {
      console.error('ScheduledNotificationsScreen: load error', error);
      Alert.alert('Erreur', 'Impossible de charger les notifications programmées.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const resetForm = () => {
    setTitle('');
    setBody('');
    setSendAt(new Date(Date.now() + 60 * 60 * 1000));
    setRecurrence('once');
  };

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Champs manquants', 'Renseigne un titre et un message.');
      return;
    }
    if (sendAt.getTime() <= Date.now()) {
      Alert.alert('Date invalide', 'La date d\'envoi doit être dans le futur.');
      return;
    }
    setSaving(true);
    try {
      await scheduledNotificationService.create({
        title: title.trim(),
        body: body.trim(),
        sendAt,
        recurrence,
      });
      setModalVisible(false);
      resetForm();
      load();
    } catch (error: any) {
      console.error('ScheduledNotificationsScreen: create error', error);
      Alert.alert('Erreur', error?.message || 'Impossible de programmer cette notification.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: ScheduledNotification) => {
    try {
      await scheduledNotificationService.setActive(item.id, !item.is_active);
      load();
    } catch (error) {
      console.error('ScheduledNotificationsScreen: toggle error', error);
      Alert.alert('Erreur', 'Impossible de modifier cette notification.');
    }
  };

  const handleDelete = (item: ScheduledNotification) => {
    Alert.alert('Supprimer', `Supprimer la notification "${item.title}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await scheduledNotificationService.remove(item.id);
            load();
          } catch (error) {
            console.error('ScheduledNotificationsScreen: delete error', error);
            Alert.alert('Erreur', 'Impossible de supprimer cette notification.');
          }
        },
      },
    ]);
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
        <Text style={styles.headerTitle}>Notifications programmées</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucune notification programmée.</Text>}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await load();
          setRefreshing(false);
        }}
        renderItem={({ item }) => {
          const date = new Date(item.send_at);
          const sentDate = item.last_sent_at ? new Date(item.last_sent_at) : null;
          const sentLabel = sentDate
            ? `${sentDate.toLocaleDateString('fr-FR')} à ${sentDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
            : '';
          return (
            <View
              style={[
                styles.card,
                item.last_status === 'sent' && styles.cardSent,
                item.last_status === 'failed' && styles.cardFailed,
              ]}
            >
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardBody} numberOfLines={2}>
                  {item.body}
                </Text>
                <View style={styles.cardMetaRow}>
                  <Ionicons name="calendar-outline" size={13} color={colors.textLight} style={{ marginRight: 4 }} />
                  <Text style={styles.cardMeta}>
                    {date.toLocaleDateString('fr-FR')} à {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={styles.recurrenceBadge}>
                  <Text style={styles.recurrenceBadgeText}>{RECURRENCE_LABELS[item.recurrence]}</Text>
                </View>
                {item.last_status === 'sent' && (
                  <View style={styles.statusRow}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} style={{ marginRight: 4 }} />
                    <Text style={[styles.statusText, { color: colors.success }]}>
                      Envoyée{item.last_sent_count != null ? ` à ${item.last_sent_count} adhérent${item.last_sent_count > 1 ? 's' : ''}` : ''} · {sentLabel}
                    </Text>
                  </View>
                )}
                {item.last_status === 'failed' && (
                  <View style={styles.statusRow}>
                    <Ionicons name="alert-circle" size={14} color={colors.error} style={{ marginRight: 4 }} />
                    <Text style={[styles.statusText, { color: colors.error }]} numberOfLines={2}>
                      Échec de l'envoi · {sentLabel}
                    </Text>
                  </View>
                )}
                {item.last_status === 'pending' && (
                  <View style={styles.statusRow}>
                    <Ionicons name="time-outline" size={14} color={colors.textLight} style={{ marginRight: 4 }} />
                    <Text style={[styles.statusText, { color: colors.textLight }]}>Envoi en cours…</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardActions}>
                <Switch value={item.is_active} onValueChange={() => handleToggleActive(item)} />
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Programmer une notification</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Titre</Text>
              <TextInput style={styles.input} placeholder="Ex: Rappel congrès" value={title} onChangeText={setTitle} />

              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Contenu de la notification..."
                value={body}
                onChangeText={setBody}
                multiline
              />

              <Text style={styles.label}>Date et heure d'envoi</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity style={styles.dateButton} onPress={() => setPickerMode('date')}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.dateButtonText}>{sendAt.toLocaleDateString('fr-FR')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateButton} onPress={() => setPickerMode('time')}>
                  <Ionicons name="time-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.dateButtonText}>
                    {sendAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>

              {pickerMode && (
                <DateTimePicker
                  value={sendAt}
                  mode={pickerMode}
                  is24Hour
                  onChange={(_, selected) => {
                    setPickerMode(null);
                    if (selected) setSendAt(selected);
                  }}
                />
              )}

              <Text style={styles.label}>Récurrence</Text>
              <View style={styles.recurrencePicker}>
                {RECURRENCE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.recurrenceOption, recurrence === option && styles.recurrenceOptionSelected]}
                    onPress={() => setRecurrence(option)}
                  >
                    <Text
                      style={[
                        styles.recurrenceOptionText,
                        recurrence === option && styles.recurrenceOptionTextSelected,
                      ]}
                    >
                      {RECURRENCE_LABELS[option]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Aperçu sur le téléphone</Text>
              <View style={styles.previewNotif}>
                <View style={styles.previewIcon}>
                  <Text style={styles.previewIconText}>mc</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewNotifTitle} numberOfLines={1}>
                    {title.trim() || 'Titre de la notification'}
                  </Text>
                  <Text style={styles.previewNotifBody} numberOfLines={2}>
                    {body.trim() || 'Le message apparaîtra ici.'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleCreate} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveButtonText}>Programmer</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  previewNotif: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    padding: spacing.md,
  },
  previewIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  previewIconText: { color: colors.white, fontWeight: '900', fontSize: 12 },
  previewNotifTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  previewNotifBody: { fontSize: 12, color: colors.textLight, marginTop: 2 },
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
    fontSize: 17,
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
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  cardSent: {
    borderLeftColor: colors.success,
  },
  cardFailed: {
    borderLeftColor: colors.error,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
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
  cardBody: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.textLight,
  },
  recurrenceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: spacing.sm,
  },
  recurrenceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  cardActions: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deleteButton: {
    marginTop: spacing.md,
    padding: 4,
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
    maxHeight: '90%',
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
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
  recurrencePicker: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  recurrenceOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recurrenceOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  recurrenceOptionText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  recurrenceOptionTextSelected: {
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
