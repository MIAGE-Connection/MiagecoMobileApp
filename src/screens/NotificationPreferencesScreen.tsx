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
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { useAuth } from '../contexts/AuthContext';
import { pushNotificationService, NotificationPreferences } from '../services/pushNotificationService';

const OPTIONS: { key: keyof Omit<NotificationPreferences, 'user_id'>; label: string; description: string }[] = [
  {
    key: 'events_reminders',
    label: 'Rappels d’événements',
    description: 'Avant un événement auquel tu es inscrit ou de ton association.',
  },
  {
    key: 'announcements',
    label: 'Annonces',
    description: 'Nouvelles annonces de ton association.',
  },
  {
    key: 'federation_news',
    label: 'Actualités fédération',
    description: 'Actualités et agenda national MIAGE Connection.',
  },
];

export const NotificationPreferencesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

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

  const handleToggle = async (key: keyof Omit<NotificationPreferences, 'user_id'>, value: boolean) => {
    if (!user?.id || !prefs) return;
    setSavingKey(key);
    setPrefs({ ...prefs, [key]: value });
    try {
      await pushNotificationService.updatePreferences(user.id, { [key]: value });
    } catch (error) {
      console.error('NotificationPreferencesScreen: update error', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder ce réglage.');
      setPrefs({ ...prefs, [key]: !value });
    } finally {
      setSavingKey(null);
    }
  };

  if (loading || !prefs) {
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
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.list}>
        {OPTIONS.map((option) => (
          <View key={option.key} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{option.label}</Text>
              <Text style={styles.rowDescription}>{option.description}</Text>
            </View>
            <Switch
              value={prefs[option.key]}
              onValueChange={(value) => handleToggle(option.key, value)}
              disabled={savingKey === option.key}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        ))}
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
    width: 36,
    height: 36,
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
  row: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
