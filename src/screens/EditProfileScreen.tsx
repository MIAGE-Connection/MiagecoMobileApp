import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';

// Profil de l'adhérent : ces informations alimentent l'annuaire de son association.
export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, refresh } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [position, setPosition] = useState(user?.position_in_association || '');
  const [year, setYear] = useState(user?.graduation_year ? String(user.graduation_year) : '');
  const [contactEmail, setContactEmail] = useState(user?.contact_email || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const yearNumber = year.trim() ? parseInt(year.trim(), 10) : null;
    if (yearNumber !== null && (isNaN(yearNumber) || yearNumber < 1980 || yearNumber > 2100)) {
      Alert.alert('Promotion invalide', "Renseigne une année sur 4 chiffres (ex : 2027).");
      return;
    }
    setSaving(true);
    try {
      await authService.updateUserProfile({
        full_name: fullName.trim() || null,
        position_in_association: position.trim() || null,
        graduation_year: yearNumber,
        contact_email: contactEmail.trim() || null,
      } as any);
      await refresh();
      Alert.alert('Profil enregistré', 'Tes informations sont à jour.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('EditProfileScreen: save error', error);
      Alert.alert('Erreur', error?.message || "Impossible d'enregistrer ton profil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon profil</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.infoText}>
              Ces informations sont visibles des adhérents de ton association dans l'annuaire. Ton adresse de connexion
              ({user?.email}) n'est pas affichée.
            </Text>
          </View>

          <Text style={styles.label}>Nom complet</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Prénom Nom" placeholderTextColor={colors.textLight} />

          <Text style={styles.label}>Poste dans l'association</Text>
          <TextInput style={styles.input} value={position} onChangeText={setPosition} placeholder="Ex : Trésorier" placeholderTextColor={colors.textLight} />

          <Text style={styles.label}>Année de promotion</Text>
          <TextInput
            style={styles.input}
            value={year}
            onChangeText={setYear}
            placeholder="Ex : 2027"
            placeholderTextColor={colors.textLight}
            keyboardType="number-pad"
            maxLength={4}
          />

          <Text style={styles.label}>Email de contact (optionnel)</Text>
          <TextInput
            style={styles.input}
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="prenom.nom@exemple.fr"
            placeholderTextColor={colors.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('NotificationInbox', { all: true })}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.linkTitle}>Historique des notifications</Text>
              <Text style={styles.linkSub}>Toutes les notifications reçues</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.border} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.linkRow, { marginTop: spacing.md }]}
            onPress={() => navigation.navigate('NotificationPreferences')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.linkTitle}>Fréquence des notifications</Text>
              <Text style={styles.linkSub}>Toutes, essentielles ou aucune</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.border} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>Enregistrer</Text>}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  content: { padding: spacing.xl, paddingTop: 0, paddingBottom: 60 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.text },
  label: { fontSize: 12, fontWeight: '700', color: colors.textLight, marginTop: spacing.md, marginBottom: 6 },
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
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  linkTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  linkSub: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  saveButton: {
    marginTop: spacing.lg,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});
