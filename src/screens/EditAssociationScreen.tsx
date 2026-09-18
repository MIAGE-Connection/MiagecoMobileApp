import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { ImageUploader } from '../components/ImageUploader';
import { Toast } from '../components/Toast';
import { associationService } from '../services/associationService';

interface EditAssociationScreenProps {
  route?: any;
}

export const EditAssociationScreen: React.FC<EditAssociationScreenProps> = ({ route }) => {
  const navigation = useNavigation<any>();
  const associationId: string = route?.params?.associationId || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const [form, setForm] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
    website_url: '',
    address: '',
    city: '',
    logo_url: '',
    instagram: '',
    members_count: '',
    mandate_events_count: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!associationId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const associationData = await associationService.getAssociationById(associationId);

      if (associationData) {
        setForm({
          name: associationData.name || '',
          description: associationData.description || '',
          email: associationData.email_contact || associationData.email || '',
          phone: associationData.phone || '',
          website_url: associationData.website_url || '',
          address: associationData.address || '',
          city: associationData.location || associationData.city || '',
          logo_url: associationData.logo_url || '',
          instagram: associationData.instagram_username || '',
          members_count: associationData.members_count?.toString() || '',
          mandate_events_count: associationData.mandate_events_count?.toString() || '',
        });
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Erreur', 'Impossible de charger les donnees');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Le nom est requis', 'error');
      return;
    }

    setSaving(true);
    try {
      const associationData = {
        description: form.description.trim(),
        // Ce sont ces deux champs (location, email_contact) qui s'affichent dans l'annuaire
        // public ; on garde city/email alignés pour ne pas avoir deux valeurs différentes.
        email_contact: form.email.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim(),
        website_url: form.website_url.trim(),
        address: form.address.trim(),
        location: form.city.trim() || undefined,
        city: form.city.trim() || undefined,
        instagram_username: form.instagram.trim().replace(/^@/, '') || undefined,
        members_count: form.members_count ? parseInt(form.members_count, 10) || 0 : 0,
        mandate_events_count: form.mandate_events_count ? parseInt(form.mandate_events_count, 10) || 0 : 0,
      };

      await associationService.updateAssociation(associationId, associationData);
      showToast('Les donnees ont ete mises a jour', 'success');
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error('Error:', error);
      showToast('Impossible de sauvegarder', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImageSelected = async (imageUri: string) => {
    try {
      const url = await associationService.uploadAssociationImage(associationId, imageUri, 'logo');
      updateField('logo_url', url);
      showToast('Logo mis à jour', 'success');
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Erreur', "Impossible d'envoyer l'image. Vérifie ta connexion et réessaie.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="dark-content" />
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Retour">
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Mon association</Text>
      <View style={styles.backButton} />
    </View>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!associationId ? (
          <Text style={styles.helperText}>Aucune association rattachée à ton compte.</Text>
        ) : null}

        <ImageUploader
          imageUrl={form.logo_url}
          onImageSelected={handleImageSelected}
          label="Logo"
        />

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom</Text>
          <View style={styles.disabledInput}>
            <Text style={styles.disabledText}>{form.name}</Text>
          </View>
          <Text style={styles.helperText}>Le nom est géré par la fédération</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Decrivez votre association..."
            value={form.description}
            onChangeText={(value) => updateField('description', value)}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email de contact</Text>
          <TextInput
            style={styles.input}
            placeholder="contact@miage.fr"
            keyboardType="email-address"
            value={form.email}
            onChangeText={(value) => updateField('email', value)}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Telephone</Text>
          <TextInput
            style={styles.input}
            placeholder="+33 6 12 34 56 78"
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={(value) => updateField('phone', value)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ville / localisation</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Nanterre"
            value={form.city}
            onChangeText={(value) => updateField('city', value)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Adresse</Text>
          <TextInput
            style={styles.input}
            placeholder="123 Rue de l'Universite"
            value={form.address}
            onChangeText={(value) => updateField('address', value)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Site web</Text>
          <TextInput
            style={styles.input}
            placeholder="https://monasso.fr"
            keyboardType="url"
            value={form.website_url}
            onChangeText={(value) => updateField('website_url', value)}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Instagram</Text>
          <TextInput
            style={styles.input}
            placeholder="identifiant, sans @"
            value={form.instagram}
            onChangeText={(value) => updateField('instagram', value)}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre d'adherents</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 150"
            keyboardType="number-pad"
            value={form.members_count}
            onChangeText={(value) => updateField('members_count', value)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre d'événements du mandat</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 5"
            keyboardType="number-pad"
            value={form.mandate_events_count}
            onChangeText={(value) => updateField('mandate_events_count', value)}
          />
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving || !associationId}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Enregistrer les modifications</Text>
          )}
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>

      <Toast
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
        duration={2500}
      />
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.lg,
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
  },
  disabledInput: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  disabledText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  spacer: {
    height: spacing.xl,
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
    maxHeight: '80%',
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
  modalInputGroup: {
    marginBottom: spacing.lg,
  },
  modalSaveButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginVertical: spacing.lg,
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
