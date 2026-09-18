import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface AppCardProps extends ViewProps {
  children: React.ReactNode;
}

export const AppCard: React.FC<AppCardProps> = ({ children, style, ...props }) => {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginVertical: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
