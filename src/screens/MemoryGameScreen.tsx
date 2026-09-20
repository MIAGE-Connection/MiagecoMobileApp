import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { buildDeck, GRID_COLUMNS, LogoSource, MemoryCard, PAIRS_COUNT } from '../data/memoryDeck';
import { memoryGameService, MemoryBest } from '../services/memoryGameService';
import { associationLogosService } from '../services/associationLogosService';

const CARD_GAP = 10;
const MISMATCH_DELAY_MS = 800;

const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const CardFace: React.FC<{ card: MemoryCard; size: number }> = ({ card, size }) => {
  const [failed, setFailed] = useState(false);
  const { face } = card;

  if (face.emoji) {
    return <Text style={{ fontSize: size * 0.5 }}>{face.emoji}</Text>;
  }
  if (!face.logoUrl || failed) {
    // Repli si le logo ne charge pas : le dernier mot du nom (souvent la ville).
    const short = face.label.split(/\s+/).filter(Boolean).pop() || '?';
    return (
      <Text style={styles.faceFallback} numberOfLines={1} adjustsFontSizeToFit>
        {short}
      </Text>
    );
  }
  return (
    <Image
      source={{ uri: face.logoUrl }}
      style={{ width: size * 0.78, height: size * 0.78 }}
      resizeMode="contain"
      onError={() => setFailed(true)}
      accessibilityLabel={face.label}
    />
  );
};

interface CardViewProps {
  card: MemoryCard;
  revealed: boolean;
  matched: boolean;
  size: number;
  onPress: (card: MemoryCard) => void;
}

// Retournement : la carte s'aplatit (scaleX → 0), change de face, puis se redéploie.
const MemoryCardView: React.FC<CardViewProps> = React.memo(({ card, revealed, matched, size, onPress }) => {
  const scaleX = useRef(new Animated.Value(1)).current;
  const [shown, setShown] = useState(revealed);

  useEffect(() => {
    if (revealed === shown) return;
    Animated.timing(scaleX, { toValue: 0, duration: 110, useNativeDriver: true }).start(() => {
      setShown(revealed);
      Animated.timing(scaleX, { toValue: 1, duration: 110, useNativeDriver: true }).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(card)}
      accessibilityRole="button"
      accessibilityLabel={shown ? card.face.label : 'Carte face cachée'}
    >
      <Animated.View
        style={[
          styles.card,
          { width: size, height: size, transform: [{ scaleX }] },
          shown ? styles.cardFront : styles.cardBack,
          matched && styles.cardMatched,
        ]}
      >
        {shown ? <CardFace card={card} size={size} /> : <Text style={styles.backText}>mc</Text>}
      </Animated.View>
    </TouchableOpacity>
  );
});

export const MemoryGameScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardSize = Math.floor((width - spacing.xl * 2 - CARD_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);

  const [loading, setLoading] = useState(true);
  const [deck, setDeck] = useState<MemoryCard[]>([]);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [won, setWon] = useState(false);
  const [best, setBest] = useState<MemoryBest | null>(null);
  const [newRecord, setNewRecord] = useState(false);

  const logosRef = useRef<LogoSource[]>([]);
  const lockRef = useRef(false);
  const secondsRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startNewGame = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    lockRef.current = false;
    secondsRef.current = 0;
    setDeck(buildDeck(logosRef.current));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setSeconds(0);
    setStarted(false);
    setWon(false);
    setNewRecord(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [logos, savedBest] = await Promise.all([associationLogosService.loadLogos(), memoryGameService.getBest()]);
      if (cancelled) return;
      logosRef.current = logos;
      setBest(savedBest);
      startNewGame();
      setLoading(false);
    })();
    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [startNewGame]);

  // Chronomètre : démarre au premier retournement, s'arrête à la victoire.
  useEffect(() => {
    if (!started || won) return;
    const interval = setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [started, won]);

  const finishGame = async (finalMoves: number) => {
    setWon(true);
    const score = { moves: finalMoves, seconds: secondsRef.current };
    const isRecord = await memoryGameService.saveIfBest(score);
    setNewRecord(isRecord);
    if (isRecord) setBest(score);
  };

  const handlePress = (card: MemoryCard) => {
    if (lockRef.current || won) return;
    if (flipped.includes(card.uid) || matched.has(card.pairId)) return;

    const nextFlipped = [...flipped, card.uid];
    setFlipped(nextFlipped);
    if (!started) setStarted(true);
    if (nextFlipped.length < 2) return;

    const nextMoves = moves + 1;
    setMoves(nextMoves);
    const [first, second] = nextFlipped.map((uid) => deck.find((c) => c.uid === uid) as MemoryCard);

    if (first.pairId === second.pairId) {
      const nextMatched = new Set(matched).add(first.pairId);
      setMatched(nextMatched);
      setFlipped([]);
      if (nextMatched.size === PAIRS_COUNT) finishGame(nextMoves);
    } else {
      lockRef.current = true;
      timeoutRef.current = setTimeout(() => {
        setFlipped([]);
        lockRef.current = false;
      }, MISMATCH_DELAY_MS);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Memory</Text>
        <TouchableOpacity onPress={startNewGame} style={styles.iconButton} accessibilityLabel="Recommencer">
          <Ionicons name="refresh" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{moves}</Text>
          <Text style={styles.statLabel}>Coups</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatTime(seconds)}</Text>
          <Text style={styles.statLabel}>Temps</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{best ? best.moves : '—'}</Text>
          <Text style={styles.statLabel}>Record</Text>
        </View>
      </View>

      <View style={styles.board}>
        {deck.map((card) => (
          <MemoryCardView
            key={card.uid}
            card={card}
            revealed={flipped.includes(card.uid) || matched.has(card.pairId)}
            matched={matched.has(card.pairId)}
            size={cardSize}
            onPress={handlePress}
          />
        ))}
      </View>

      <Text style={styles.hint}>Retrouve les {PAIRS_COUNT} paires en un minimum de coups.</Text>

      {won ? (
        <View style={styles.winOverlay}>
          <View style={styles.winPanel}>
            <Text style={styles.winEmoji}>🎉</Text>
            <Text style={styles.winTitle}>Bravo !</Text>
            <Text style={styles.winText}>
              {moves} coups en {formatTime(seconds)}
            </Text>
            {newRecord ? <Text style={styles.recordText}>Nouveau record !</Text> : null}
            <TouchableOpacity style={styles.primaryButton} onPress={startNewGame}>
              <Text style={styles.primaryButtonText}>Rejouer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
              <Text style={styles.secondaryButtonText}>Retour aux jeux</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  stats: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  statBox: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '900', color: colors.primary },
  statLabel: { fontSize: 11, fontWeight: '700', color: colors.textLight, marginTop: 2 },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    paddingHorizontal: spacing.xl,
  },
  card: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  cardBack: { backgroundColor: colors.primary, borderColor: colors.primary },
  cardFront: { backgroundColor: colors.white, borderColor: colors.border },
  cardMatched: { borderColor: colors.success, backgroundColor: '#ECFDF5' },
  backText: { color: 'rgba(255,255,255,0.85)', fontSize: 18, fontWeight: '900' },
  faceFallback: { fontSize: 13, fontWeight: '800', color: colors.primary, paddingHorizontal: 4 },
  hint: { textAlign: 'center', color: colors.textLight, fontSize: 12, marginTop: spacing.lg, paddingHorizontal: spacing.xl },
  winOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,26,74,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  winPanel: { width: '100%', backgroundColor: colors.white, borderRadius: 24, padding: spacing.xl, alignItems: 'center' },
  winEmoji: { fontSize: 44 },
  winTitle: { fontSize: 24, fontWeight: '900', color: colors.text, marginTop: spacing.sm },
  winText: { fontSize: 15, color: colors.textLight, marginTop: spacing.sm },
  recordText: { fontSize: 14, fontWeight: '800', color: colors.success, marginTop: spacing.sm },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 48,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  primaryButtonText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  secondaryButton: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  secondaryButtonText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
});
