import React, { useRef } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface ImageUploaderProps {
  imageUrl?: string;
  onImageSelected: (uri: string) => Promise<void>;
  label?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  imageUrl,
  onImageSelected,
  label = 'Choisir une photo',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = React.useState(false);

  const pickImageMobile = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setLoading(true);
        await onImageSelected(result.assets[0].uri);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de selectionner l\'image');
      setLoading(false);
    }
  };

  const pickImageWeb = () => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleWebFileChange = async (event: any) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          setLoading(true);
          const base64 = reader.result as string;
          await onImageSelected(base64);
          setLoading(false);
        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert('Erreur', 'Impossible de telecharger l\'image');
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePress = () => {
    if (Platform.OS === 'web') {
      pickImageWeb();
    } else {
      pickImageMobile();
    }
  };

  return (
    <View style={styles.container}>
      {imageUrl ? (
        <View style={styles.imageWrapper}>
          <Image source={{ uri: imageUrl }} style={styles.image} />
          {!loading && (
            <TouchableOpacity style={styles.changeButton} onPress={handlePress}>
              <Ionicons name="camera" size={20} color={colors.white} />
            </TouchableOpacity>
          )}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={colors.white} />
            </View>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={styles.placeholderButton}
          onPress={handlePress}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : (
            <>
              <Ionicons name="image-outline" size={32} color={colors.primary} />
              <Text style={styles.placeholderText}>{label}</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleWebFileChange}
          style={{ display: 'none' }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  imageWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.border,
  },
  changeButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  placeholderText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
