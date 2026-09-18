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
  const associationId = route?.params?.associationId || 'sample-id';

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
    members_count: '',
    mandate_events_count: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const associationData = await associationService.getAssociationById(associationId);

      if (associationData) {
        setForm({
          name: associationData.name || '',
          description: associationData.description || '',
          email: associationData.email || '',
          phone: associationData.phone || '',
          website_url: associationData.website_url || '',
          address: associationData.address || '',
          city: associationData.city || '',
          logo_url: associationData.logo_url || '',
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
        name: form.name,
        description: form.description,
        email: form.email,
        phone: form.phone,
        website_url: form.website_url,
        address: form.address,
        city: form.city,
        logo_url: form.logo_url,
        members_count: form.members_count ? parseInt(form.members_count, 10) : undefined,
        mandate_events_count: form.mandate_events_count ? parseInt(form.mandate_events_count, 10) : undefined,
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
      updateField('logo_url', imageUri);
      Alert.alert('Succes', 'L\'image a ete selectionnee');
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Erreur', 'Impossible de traiter l\'image');
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Editer mon association</Text>

        <ImageUploader
          imageUrl={form.logo_url}
          onImageSelected={handleImageSelected}
          label="Logo"
        />

        <View style={styles.inputGroup}>
          <Text style={styles.label}>URL du logo</Text>
          <TextInput
            style={styles.input}
            placeholder="https://exemple.com/logo.png"
            keyboardType="url"
            value={form.logo_url}
            onChangeText={(value) => updateField('logo_url', value)}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom</Text>
          <View style={styles.disabledInput}>
            <Text style={styles.disabledText}>{form.name}</Text>
          </View>
          <Text style={styles.helperText}>Le nom de votre association ne peut pas etre modifie</Text>
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
          <Text style={styles.label}>Email</Text>
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
          <Text style={styles.label}>Ville</Text>
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
          disabled={saving}
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
  );
};

const styles = StyleSheet.create({
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
