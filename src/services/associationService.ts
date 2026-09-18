import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export interface Association {
  id: string;
  name: string;
  description?: string;
  location?: string;
  email_contact?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  website_url?: string;
  instagram_username?: string;
  banner_url?: string;
  logo_url?: string;
  members_count?: number;
  mandate_events_count?: number;
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const associationService = {
  // Non filtré par is_published : utilisé pour charger sa propre association (admin) par id.
  async getAssociationById(id: string): Promise<Association> {
    if (!id || id === '') throw new Error('ID de l\'association manquant');

    const { data, error } = await supabase
      .from('associations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Annuaire public : ne retourne que les associations publiées.
  async getAllAssociations(): Promise<Association[]> {
    const { data, error } = await supabase
      .from('associations')
      .select('*')
      .eq('is_published', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  },

  async updateAssociation(id: string, updates: Partial<Association>): Promise<Association> {
    if (!id || id === '') throw new Error('ID de l\'association manquant');

    const { data, error } = await supabase
      .from('associations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async pickImage(): Promise<string | null> {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permissions d\'accès à la galerie refusées');
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }
    return null;
  },

  async uploadAssociationBanner(associationId: string, imageUri: string): Promise<string> {
    if (!associationId) throw new Error('ID de l\'association manquant');

    let base64Data: string;

    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    const fileName = `${associationId}/banner-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('associations')
      .upload(fileName, Buffer.from(base64Data, 'base64'), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('associations')
      .getPublicUrl(fileName);

    const bannerUrl = urlData.publicUrl;

    await this.updateAssociation(associationId, { banner_url: bannerUrl });

    return bannerUrl;
  }
};
