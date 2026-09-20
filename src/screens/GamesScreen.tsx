import React, { useCallback, useState } from 'react';
import { Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { memoryGameService, MemoryBest } from '../services/memoryGameService';
import { snakeGameService } from '../services/snakeGameService';
import { puzzleGameService, PuzzleBest } from '../services/puzzleGameService';

// Section Jeux : ouverte à tous (visiteurs compris). D'autres jeux s'ajoutent ici.
export const GamesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [best, setBest] = useState<MemoryBest | null>(null);
  const [snakeBest, setSnakeBest] = useState(0);
  const [puzzleBest, setPuzzleBest] = useState<PuzzleBest | null>(null);

  // Le record peut avoir changé après une partie : on le relit à chaque retour.
  useFocusEffect(
    useCallback(() => {
      memoryGameService.getBest().then(setBest);
      snakeGameService.getBest().then(setSnakeBest);
      puzzleGameService.getBest(3).then(setPuzzleBest);
    }, [])
  );

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Jeux</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.gameCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('MemoryGame')}
          accessibilityLabel="Jouer au Memory"
        >
          <View style={styles.gameIcon}>
            <Ionicons name="grid-outline" size={28} color={colors.primary} />
          </View>
          <View style={styles.gameInfo}>
            <Text style={styles.gameTitle}>Memory</Text>
            <Text style={styles.gameSubtitle}>Retrouve les paires avec les logos des associations du réseau.</Text>
            {best ? (
              <View style={styles.recordPill}>
                <Ionicons name="trophy-outline" size={12} color={colors.primary} />
                <Text style={styles.recordText}>Record : {best.moves} coups</Text>
              </View>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.border} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gameCard, { marginTop: spacing.md }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('SnakeGame')}
          accessibilityLabel="Jouer au Snake"
        >
          <View style={styles.gameIcon}>
            <Ionicons name="analytics-outline" size={28} color={colors.primary} />
          </View>
          <View style={styles.gameInfo}>
            <Text style={styles.gameTitle}>Snake</Text>
            <Text style={styles.gameSubtitle}>Mange le logo de la fédération et grandis sans te mordre la queue.</Text>
            {snakeBest > 0 ? (
              <View style={styles.recordPill}>
                <Ionicons name="trophy-outline" size={12} color={colors.primary} />
                <Text style={styles.recordText}>Record : {snakeBest}</Text>
              </View>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.border} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gameCard, { marginTop: spacing.md }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('PuzzleGame')}
          accessibilityLabel="Jouer au Taquin"
        >
          <View style={styles.gameIcon}>
            <Ionicons name="apps-outline" size={28} color={colors.primary} />
          </View>
          <View style={styles.gameInfo}>
            <Text style={styles.gameTitle}>Taquin</Text>
            <Text style={styles.gameSubtitle}>Reconstitue le logo de la fédération ou d'une association en faisant glisser les tuiles.</Text>
            {puzzleBest ? (
              <View style={styles.recordPill}>
                <Ionicons name="trophy-outline" size={12} color={colors.primary} />
                <Text style={styles.recordText}>Record 3×3 : {puzzleBest.moves} coups</Text>
              </View>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.border} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
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
  iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  content: { padding: spacing.xl, paddingTop: spacing.md },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: spacing.lg,
  },
  gameIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  gameInfo: { flex: 1 },
  gameTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  gameSubtitle: { fontSize: 13, color: colors.textLight, lineHeight: 18, marginTop: 2 },
  recordPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: spacing.sm,
  },
  recordText: { fontSize: 11, fontWeight: '700', color: colors.primary },
});
