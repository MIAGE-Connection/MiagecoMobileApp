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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { useAuth } from '../contexts/AuthContext';
import { pushNotificationService, NotificationPreferences } from '../services/pushNotificationService';

type NotificationMode = 'all' | 'partial' | 'none';

const MODES: { key: NotificationMode; icon: keyof typeof Ionicons.glyphMap; label: string; description: string }[] = [
  {
    key: 'all',
    icon: 'notifications',
    label: 'Toutes',
    description: 'Tous les messages de la fédération, rappels d’événements et actualités.',
  },
  {
    key: 'partial',
    icon: 'notifications-circle-outline',
    label: 'Essentielles',
    description: 'Uniquement les messages importants, sans rappels ni actualités.',
  },
  {
    key: 'none',
    icon: 'notifications-off-outline',
    label: 'Aucune',
    description: 'Tu ne recevras plus aucune notification.',
  },
];

const MODE_VALUES: Record<NotificationMode, Omit<NotificationPreferences, 'user_id'>> = {
  all: { events_reminders: true, announcements: true, federation_news: true },
  partial: { events_reminders: false, announcements: true, federation_news: false },
  none: { events_reminders: false, announcements: false, federation_news: false },
};

const deriveMode = (prefs: NotificationPreferences): NotificationMode => {
  if (prefs.events_reminders && prefs.announcements && prefs.federation_news) return 'all';
  if (!prefs.events_reminders && !prefs.announcements && !prefs.federation_news) return 'none';
  return 'partial';
};

export const NotificationPreferencesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const data = await pushNotificationService.getPreferences(user.id);
      setPrefs(data);
    } catch (error) {
      console.error('NotificationPreferencesScreen: load error', error);
      Alert.alert('Erreur', 'Impossible de charger tes préférences.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSelect = async (mode: NotificationMode) => {
    if (!user?.id || !prefs || saving) return;
    const previous = prefs;
    setSaving(true);
    setPrefs({ ...prefs, ...MODE_VALUES[mode] });
    try {
      await pushNotificationService.updatePreferences(user.id, MODE_VALUES[mode]);
    } catch (error) {
      console.error('NotificationPreferencesScreen: update error', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder ce réglage.');
      setPrefs(previous);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !prefs) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentMode = deriveMode(prefs);

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.list}>
        <Text style={styles.intro}>Choisis ce que tu souhaites recevoir sur ton téléphone.</Text>
        {MODES.map((mode) => {
          const selected = currentMode === mode.key;
          return (
            <TouchableOpacity
              key={mode.key}
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => handleSelect(mode.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, selected && styles.iconBoxSelected]}>
                <Ionicons name={mode.icon} size={22} color={selected ? colors.white : colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{mode.label}</Text>
                <Text style={styles.rowDescription}>{mode.description}</Text>
              </View>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selected ? colors.primary : colors.border}
              />
            </TouchableOpacity>
          );
        })}
      </View>
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
  list: {
    padding: spacing.xl,
    paddingTop: 0,
  },
  intro: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: spacing.lg,
    lineHeight: 19,
  },
  row: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconBoxSelected: {
    backgroundColor: colors.primary,
  },
  rowText: {
    flex: 1,
    marginRight: spacing.md,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  rowDescription: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
  },
});
