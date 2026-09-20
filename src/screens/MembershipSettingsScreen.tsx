import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { membershipSettingsService } from '../services/membershipSettingsService';
import {
  DEFAULT_END,
  EndDate,
  MONTH_NAMES,
  formatDate,
  formatEnd,
  maxDay,
  nextOccurrence,
} from '../utils/membershipEnd';
import { ErrorState } from '../components/ErrorState';

// Super admin : date de fin d'adhésion (jour + mois, chaque année). Elle sert à calculer
// la validité de chaque adhérent à sa connexion / son renouvellement.
export const MembershipSettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<EndDate>(DEFAULT_END);
  const [month, setMonth] = useState(DEFAULT_END.month);
  const [day, setDay] = useState(DEFAULT_END.day);
  const [activeCount, setActiveCount] = useState(0);
  const [applyNow, setApplyNow] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [end, count] = await Promise.all([
        membershipSettingsService.getEnd(),
        membershipSettingsService.countActiveMembers(),
      ]);
      setSaved(end);
      setMonth(end.month);
      setDay(end.day);
      setActiveCount(count);
    } catch (e) {
      console.error('MembershipSettingsScreen: load error', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const chosen: EndDate = { month, day };
  const changed = month !== saved.month || day !== saved.day;
  const canSave = (changed || applyNow) && !saving;

  const selectMonth = (next: number) => {
    setMonth(next);
    // Le jour reste valable dans le nouveau mois (31 janvier → février = 28).
    setDay((current) => Math.min(current, maxDay(next)));
  };

  const stepDay = (delta: number) => setDay((current) => Math.min(maxDay(month), Math.max(1, current + delta)));

  const runSave = async () => {
    setSaving(true);
    try {
      const affected = await membershipSettingsService.save(chosen, applyNow);
      setSaved(chosen);
      setApplyNow(false);
      Alert.alert(
        'Enregistré',
        applyNow
          ? `La fin d'adhésion est fixée au ${formatEnd(chosen)}. ${affected} adhérent${affected > 1 ? 's ont' : ' a'} été mis à jour.`
          : `La fin d'adhésion est fixée au ${formatEnd(chosen)}. Elle s'appliquera à chaque connexion ou renouvellement.`
      );
    } catch (e: any) {
      console.error('MembershipSettingsScreen: save error', e);
      const missing = e?.code === 'PGRST202' || /set_membership_end/.test(e?.message ?? '');
      Alert.alert(
        'Erreur',
        missing
          ? "Le script SQL de la phase 15 n'a pas encore été exécuté dans Supabase."
          : e?.message || "Impossible d'enregistrer le réglage."
      );
    } finally {
      setSaving(false);
    }
  };

  // Confirmation : changer cette date touche la durée de l'accès de tous les adhérents concernés.
  const handleSave = () => {
    const next = nextOccurrence(chosen);
    const lines = [`Fin d'adhésion : ${formatEnd(chosen)} chaque année.`, `Prochaine échéance : ${formatDate(next)}.`];
    lines.push(
      applyNow
        ? `\nCette date sera appliquée maintenant aux ${activeCount} adhérents actifs.`
        : "\nElle s'appliquera à chaque nouvelle connexion ou renouvellement. Les adhérents actuels gardent leur date jusque-là."
    );
    Alert.alert('Confirmer ?', lines.join('\n'), [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Enregistrer', onPress: runSave },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fin d'adhésion</Text>
        <View style={styles.iconButton} />
      </View>

      {error ? (
        <ErrorState onRetry={load} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.currentCard}>
            <Text style={styles.currentLabel}>Réglage actuel</Text>
            <Text style={styles.currentValue}>{formatEnd(saved)}</Text>
            <Text style={styles.currentSub}>Prochaine échéance : {formatDate(nextOccurrence(saved))}</Text>
          </View>

          <Text style={styles.sectionLabel}>Nouveau mois</Text>
          <View style={styles.monthGrid}>
            {MONTH_NAMES.map((name, i) => {
              const selected = month === i + 1;
              return (
                <TouchableOpacity
                  key={name}
                  style={[styles.monthChip, selected && styles.monthChipActive]}
                  onPress={() => selectMonth(i + 1)}
                  accessibilityLabel={name}
                >
                  <Text style={[styles.monthText, selected && styles.monthTextActive]}>{name.slice(0, 4)}.</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Nouveau jour</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => stepDay(-1)}
              onLongPress={() => stepDay(-5)}
              accessibilityLabel="Jour précédent"
            >
              <Ionicons name="remove" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.stepValue}>{day}</Text>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => stepDay(1)}
              onLongPress={() => stepDay(5)}
              accessibilityLabel="Jour suivant"
            >
              <Ionicons name="add" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.previewBox}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.previewText}>
              Avec ce réglage, une adhésion créée ou renouvelée aujourd'hui est valable jusqu'au{' '}
              <Text style={styles.previewStrong}>{formatDate(nextOccurrence(chosen))}</Text>.
            </Text>
          </View>

          <View style={styles.applyRow}>
            <View style={styles.applyInfo}>
              <Text style={styles.applyTitle}>Appliquer maintenant aux adhérents actifs</Text>
              <Text style={styles.applyHint}>
                {activeCount} adhérent{activeCount > 1 ? 's' : ''} concerné{activeCount > 1 ? 's' : ''}. Sans cette
                option, la nouvelle date s'applique à chaque connexion ou renouvellement.
              </Text>
            </View>
            <Switch
              value={applyNow}
              onValueChange={setApplyNow}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          <Text style={styles.note}>
            Personne n'est expiré du jour au lendemain : la date choisie est toujours la prochaine à venir. Si tu la
            rapproches, la durée d'adhésion des adhérents concernés est raccourcie.
          </Text>

          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>Enregistrer</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
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
  content: { padding: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  currentCard: { backgroundColor: colors.primary, borderRadius: 18, padding: spacing.xl, alignItems: 'center' },
  currentLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  currentValue: { fontSize: 30, fontWeight: '900', color: colors.white, marginTop: 4 },
  currentSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: colors.textLight, marginTop: spacing.xl, marginBottom: spacing.sm },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  monthChip: {
    width: '23.5%',
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  monthText: { fontSize: 13, fontWeight: '700', color: colors.text },
  monthTextActive: { color: colors.white },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  stepButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { minWidth: 64, textAlign: 'center', fontSize: 34, fontWeight: '900', color: colors.text },
  previewBox: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  previewText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.text },
  previewStrong: { fontWeight: '800', color: colors.primary },
  applyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  applyInfo: { flex: 1 },
  applyTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  applyHint: { fontSize: 12, lineHeight: 17, color: colors.textLight, marginTop: 4 },
  note: { fontSize: 12, lineHeight: 17, color: colors.textLight, marginTop: spacing.lg },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});
