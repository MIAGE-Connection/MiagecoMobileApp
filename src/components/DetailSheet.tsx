import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const CLOSE_DISTANCE = 100; // px de glissement vers le bas au-delà desquels la fiche se ferme
const CLOSE_VELOCITY = 0.8;

// Fiche détaillée en bas d'écran, réutilisée (événements, associations, annuaire...).
// Se ferme avec le bouton, en touchant l'arrière-plan, ou en tirant la petite barre vers le bas.
export const DetailSheet: React.FC<Props> = ({ visible, onClose, children }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // À chaque ouverture, la fiche repart à sa place.
  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const handlePan = useMemo(() => {
    const snapBack = () => Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_event, gesture) => {
        translateY.setValue(Math.max(0, gesture.dy));
      },
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy > CLOSE_DISTANCE || gesture.vy > CLOSE_VELOCITY) {
          Animated.timing(translateY, { toValue: 700, duration: 160, useNativeDriver: true }).start(() =>
            onCloseRef.current()
          );
        } else {
          snapBack();
        }
      },
      onPanResponderTerminate: snapBack,
    });
  }, [translateY]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          {/* Zone de prise plus large que la barre visible, pour tirer facilement. */}
          <View style={styles.handleZone} {...handlePan.panHandlers} accessibilityLabel="Tirer vers le bas pour fermer">
            <View style={styles.handle} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {children}
          </ScrollView>
          <TouchableOpacity style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>Fermer</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

export const SheetAction: React.FC<{ label: string; onPress: () => void; primary?: boolean; active?: boolean }> = ({
  label,
  onPress,
  primary,
  active,
}) => (
  <TouchableOpacity
    style={[styles.action, primary && styles.actionPrimary, active && styles.actionActive]}
    onPress={onPress}
    activeOpacity={0.8}
  >
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
    paddingTop: 0,
    paddingBottom: spacing.xl,
  },
  handleZone: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.md, marginHorizontal: -spacing.xl },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
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
  actionActive: { backgroundColor: colors.primarySoft },
  actionText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  actionTextPrimary: { color: colors.white },
});
