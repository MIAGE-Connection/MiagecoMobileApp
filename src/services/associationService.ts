import { supabase } from './supabase';
import { resizeTarget } from '../utils/imageSizing';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Image, Platform } from 'react-native';

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

// Réduit et compresse l'image avant l'envoi : un logo de 3 Mo pris à la galerie devient ~10-25 Ko.
// WebP garde la transparence des logos (contrairement au JPEG, qui les noircit).
// En cas de problème on envoie l'image d'origine plutôt que de bloquer l'utilisateur.
async function optimizeImage(uri: string, kind: 'banner' | 'logo'): Promise<string> {
  try {
    const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) =>
      Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject)
    );
    const resize = resizeTarget(kind, width, height);
    const result = await ImageManipulator.manipulateAsync(uri, resize ? [{ resize }] : [], {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.WEBP,
    });
    return result.uri;
  } catch (error) {
    console.warn("optimizeImage: envoi de l'image d'origine", error);
    return uri;
  }
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

  // Super admin (RLS admin_full_access) : toutes les associations, publiées ou non.
  async listForAdmin(): Promise<Pick<Association, 'id' | 'name' | 'location' | 'is_published'>[]> {
    const { data, error } = await supabase
      .from('associations')
      .select('id, name, location, is_published')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createAssociation(values: {
    name: string;
    location?: string;
    email_contact?: string;
    is_published: boolean;
  }): Promise<Association> {
    const { data, error } = await supabase
      .from('associations')
      .insert({
        name: values.name.trim(),
        location: values.location?.trim() || null,
        email_contact: values.email_contact?.trim() || null,
        is_published: values.is_published,
      })
      .select()
      .single();

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

  // Envoie l'image dans le bucket « associations » et enregistre son URL publique.
  async uploadAssociationImage(
    associationId: string,
    imageUri: string,
    kind: 'banner' | 'logo'
  ): Promise<string> {
    if (!associationId) throw new Error('ID de l\'association manquant');

    const isWeb = Platform.OS === 'web';
    const optimizedUri = isWeb ? imageUri : await optimizeImage(imageUri, kind);
    // Sur mobile l'image sort de optimizeImage en WebP ; sur le web on garde l'image telle quelle.
    const ext = isWeb ? 'jpg' : 'webp';
    const mime = isWeb ? 'image/jpeg' : 'image/webp';

    const path = `${associationId}/${kind}-${Date.now()}.${ext}`;
    let body: any;
    if (isWeb) {
      body = await (await fetch(optimizedUri)).blob();
    } else {
      const form = new FormData();
      form.append('file', { uri: optimizedUri, name: `${kind}.${ext}`, type: mime } as any);
      body = form;
    }

    const { error: uploadError } = await supabase.storage
      .from('associations')
      .upload(path, body, { contentType: mime, upsert: true });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('associations').getPublicUrl(path);
    const url = urlData.publicUrl;

    await this.updateAssociation(associationId, kind === 'logo' ? { logo_url: url } : { banner_url: url });
    return url;
  },

  uploadAssociationBanner(associationId: string, imageUri: string): Promise<string> {
    return this.uploadAssociationImage(associationId, imageUri, 'banner');
  },
};
