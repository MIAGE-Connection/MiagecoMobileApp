import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// Fiche détaillée en bas d'écran, réutilisée (événements, associations...).
export const DetailSheet: React.FC<Props> = ({ visible, onClose, children }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {children}
        </ScrollView>
        <TouchableOpacity style={styles.close} onPress={onClose}>
          <Text style={styles.closeText}>Fermer</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export const SheetAction: React.FC<{ label: string; onPress: () => void; primary?: boolean }> = ({
  label,
  onPress,
  primary,
}) => (
  <TouchableOpacity style={[styles.action, primary && styles.actionPrimary]} onPress={onPress} activeOpacity={0.8}>
    <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
  </TouchableOpacity>
);

export const sheetStyles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  meta: { fontSize: 13, color: colors.textLight, marginTop: 6 },
  body: { fontSize: 15, lineHeight: 23, color: colors.text, marginTop: spacing.lg },
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(14, 26, 74, 0.45)' },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  content: { paddingBottom: spacing.lg },
  close: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: { color: colors.text, fontWeight: '700' },
  action: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  actionPrimary: { backgroundColor: colors.primary },
  actionText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  actionTextPrimary: { color: colors.white },
});
