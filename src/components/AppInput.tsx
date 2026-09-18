import React from 'react';
import { StyleSheet, View, Text, TextInput, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface AppInputProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  error?: string;
  onLabelLinkPress?: () => void;
  labelLinkText?: string;
}

export const AppInput: React.FC<AppInputProps> = ({
  label,
  icon,
  rightIcon,
  onRightIconPress,
  error,
  onLabelLinkPress,
  labelLinkText,
  style,
  ...props
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        {label && <Text style={styles.label}>{label}</Text>}
        {labelLinkText && (
          <TouchableOpacity onPress={onLabelLinkPress}>
            <Text style={styles.labelLink}>{labelLinkText}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={[styles.inputWrapper, error ? styles.inputError : null, style]}>
        {icon && (
          <Ionicons name={icon} size={20} color={colors.primary} style={styles.leftIcon} />
        )}
        <TextInput
          style={styles.input}
          placeholderTextColor="rgba(22, 17, 58, 0.4)"
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            <Ionicons name={rightIcon} size={20} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 1,
  },
  labelLink: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3FE', // Background des inputs du design
    borderRadius: 16,
    height: 56,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: colors.error,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: '100%',
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  rightIcon: {
    padding: spacing.xs,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
