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
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { siteSettingsService, HomeStatSetting } from '../services/siteSettingsService';
import { statsService } from '../services/statsService';

// Doit rester dans le même ordre que le bandeau de l'accueil.
const SLOTS = [
  { defaultLabel: 'Associations', example: '18' },
  { defaultLabel: 'Événements', example: '25+' },
  { defaultLabel: 'MIAGistes', example: '5000+' },
];

export const HomeStatsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<HomeStatSetting[]>(SLOTS.map(() => ({ label: '', value: '' })));
  const [autoValues, setAutoValues] = useState<string[]>(['—', '—', '—']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [saved, assos, events] = await Promise.all([
        siteSettingsService.getHomeStats(),
        statsService.getAssociationsCount(),
        statsService.getUpcomingEventsCount(),
      ]);
      setStats(saved);
      // Pas de chiffre réel pour les MIAGistes (liste privée) : bloc 100 % manuel.
      setAutoValues([String(assos), String(events), '—']);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const update = (index: number, field: keyof HomeStatSetting, text: string) => {
    setStats((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: text } : s)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await siteSettingsService.saveHomeStats(stats);
      Alert.alert('Enregistré', "Les chiffres de l'accueil sont à jour.");
    } catch (error: any) {
      console.error('HomeStatsScreen: save error', error);
      Alert.alert('Erreur', error?.message || "Impossible d'enregistrer.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStats(SLOTS.map(() => ({ label: '', value: '' })));
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
        <Text style={styles.headerTitle}>Chiffres de l'accueil</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>APERÇU</Text>
          <View style={styles.previewCard}>
            {SLOTS.map((slot, i) => (
              <React.Fragment key={slot.defaultLabel}>
                {i > 0 && <View style={styles.previewDivider} />}
                <View style={styles.previewBlock}>
                  <Text style={styles.previewValue}>{stats[i].value.trim() || autoValues[i]}</Text>
                  <Text style={styles.previewLabel}>{stats[i].label.trim() || slot.defaultLabel}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.infoText}>
              Affichage uniquement : ces chiffres n'ont aucun effet sur les données de l'app. Pour Associations et
              Événements, un champ vide affiche le chiffre réel. Le bloc MIAGistes est à renseigner à la main.
            </Text>
          </View>

          {SLOTS.map((slot, i) => (
            <View key={slot.defaultLabel} style={styles.slotCard}>
              <Text style={styles.slotTitle}>Bloc {i + 1}</Text>

              <Text style={styles.label}>Chiffre affiché</Text>
              <TextInput
                style={styles.input}
                value={stats[i].value}
                onChangeText={(t) => update(i, 'value', t)}
                placeholder={
                  i === 2
                    ? `À renseigner (ex : ${slot.example})`
                    : `Chiffre réel : ${autoValues[i]}  (ex : ${slot.example})`
                }
                placeholderTextColor={colors.textLight}
                maxLength={12}
              />

              <Text style={styles.label}>Libellé</Text>
              <TextInput
                style={styles.input}
                value={stats[i].label}
                onChangeText={(t) => update(i, 'label', t)}
                placeholder={slot.defaultLabel}
                placeholderTextColor={colors.textLight}
                maxLength={20}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>Enregistrer</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset} disabled={saving}>
            <Text style={styles.resetText}>Tout vider (revenir aux chiffres réels)</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  content: {
    padding: spacing.xl,
    paddingTop: 0,
    paddingBottom: 60,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textLight,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewBlock: {
    flex: 1,
    alignItems: 'center',
  },
  previewDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  previewValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
  },
  previewLabel: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '600',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: spacing.md,
    marginVertical: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.text,
  },
  slotCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  slotTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
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
  saveButton: {
    marginTop: spacing.lg,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  resetButton: {
    marginTop: spacing.md,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetText: {
    color: colors.textLight,
    fontWeight: '700',
    fontSize: 13,
  },
});
