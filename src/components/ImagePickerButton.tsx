import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface ImagePickerButtonProps {
  onPress: () => void;
  imageUrl?: string;
  label?: string;
}

export const ImagePickerButton: React.FC<ImagePickerButtonProps> = ({
  onPress,
  imageUrl,
  label = 'Choisir une photo',
}) => {
  return (
    <View style={styles.container}>
      {imageUrl ? (
        <View style={styles.imageWrapper}>
          <Image source={{ uri: imageUrl }} style={styles.image} />
          <TouchableOpacity style={styles.changeButton} onPress={onPress}>
            <Ionicons name="camera" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.placeholderButton} onPress={onPress}>
          <Ionicons name="image-outline" size={32} color={colors.primary} />
          <Text style={styles.placeholderText}>{label}</Text>
        </TouchableOpacity>
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
