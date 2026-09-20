import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Easing,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import {
  COLS,
  ROWS,
  Direction,
  OPPOSITE,
  Point,
  SnakeState,
  createInitialState,
  speedFor,
  step,
} from '../data/snakeLogic';
import { snakeGameService } from '../services/snakeGameService';

// Le logo de la fédération (icône de l'app) remplace la pomme.
const FEDERATION_LOGO = require('../../assets/icon.png');

const SWIPE_THRESHOLD = 12; // px parcourus avant de compter un glissement
const MAX_QUEUED_TURNS = 2; // deux virages rapides d'affilée sont mémorisés, pas plus
const SNAKE_BODY = '#10B981';
const SNAKE_HEAD = '#047857';
const SEGMENT_INSET = 1;

type Phase = 'ready' | 'playing' | 'paused' | 'ended';

// Position des yeux (fraction de la tête) selon la direction.
const EYES: Record<Direction, [number, number][]> = {
  right: [[0.68, 0.3], [0.68, 0.7]],
  left: [[0.32, 0.3], [0.32, 0.7]],
  up: [[0.3, 0.32], [0.7, 0.32]],
  down: [[0.3, 0.68], [0.7, 0.68]],
};

const toPixels = (p: Point, cell: number) => ({ x: p.x * cell + SEGMENT_INSET, y: p.y * cell + SEGMENT_INSET });

// Le logo « pop » à son apparition : on voit tout de suite où il est réapparu.
const FoodLogo: React.FC<{ x: number; y: number; cell: number }> = ({ x, y, cell }) => {
  const scale = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    scale.setValue(0.4);
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();
  }, [x, y, scale]);
  return (
    <Animated.Image
      source={FEDERATION_LOGO}
      resizeMode="contain"
      accessibilityLabel="Logo de la fédération"
      style={{
        position: 'absolute',
        left: x * cell - cell * 0.15,
        top: y * cell - cell * 0.15,
        width: cell * 1.3,
        height: cell * 1.3,
        transform: [{ scale }],
      }}
    />
  );
};

export const SnakeGameScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [game, setGame] = useState<SnakeState>(() => createInitialState());
  const [phase, setPhase] = useState<Phase>('ready');
  const [best, setBest] = useState(0);
  const [newRecord, setNewRecord] = useState(false);
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const [, forceRender] = useReducer((n: number) => n + 1, 0);

  // Ce que lisent le chrono et le geste passe par des refs : jamais de valeur périmée.
  const gameRef = useRef(game);
  const phaseRef = useRef<Phase>('ready');
  const queueRef = useRef<Direction[]>([]);
  const cellRef = useRef(0);
  // Une position animée par segment : le mouvement est calculé côté natif, sans repasser par React.
  const positionsRef = useRef<Animated.ValueXY[]>([]);

  const updatePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  // Place instantanément les segments (démarrage, nouvelle partie, changement de taille d'écran).
  const snapPositions = useCallback((snake: Point[]) => {
    const list = positionsRef.current;
    snake.forEach((point, i) => {
      const value = toPixels(point, cellRef.current);
      if (list[i]) list[i].setValue(value);
      else list[i] = new Animated.ValueXY(value);
    });
    list.length = snake.length;
    forceRender();
  }, []);

  // Fait glisser chaque segment vers sa nouvelle case, à vitesse constante pendant tout le tic.
  const advancePositions = useCallback((previous: Point[], next: Point[], duration: number) => {
    const list = positionsRef.current;
    const cell = cellRef.current;
    next.forEach((point, i) => {
      if (!list[i]) {
        // Nouveau bout de queue : il naît sur l'ancienne queue puis suit le mouvement.
        list[i] = new Animated.ValueXY(toPixels(previous[previous.length - 1], cell));
      }
      Animated.timing(list[i], {
        toValue: toPixels(point, cell),
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  useEffect(() => {
    snakeGameService.getBest().then(setBest);
  }, []);

  const restart = useCallback(() => {
    const fresh = createInitialState();
    gameRef.current = fresh;
    queueRef.current = [];
    snapPositions(fresh.snake);
    setGame(fresh);
    setNewRecord(false);
    updatePhase('ready');
  }, [snapPositions, updatePhase]);

  const finish = useCallback(
    async (finalScore: number) => {
      updatePhase('ended');
      try {
        Vibration.vibrate(60);
      } catch {
        // La vibration est un plus, jamais bloquante.
      }
      const isRecord = await snakeGameService.saveIfBest(finalScore);
      if (isRecord) {
        setBest(finalScore);
        setNewRecord(true);
      }
    },
    [updatePhase]
  );

  // Un virage demandé : ignoré s'il répète la direction ou s'il fait demi-tour.
  const handleInput = useCallback(
    (dir: Direction) => {
      const current = phaseRef.current;
      if (current !== 'ready' && current !== 'playing') return;
      const queue = queueRef.current;
      const last = queue.length > 0 ? queue[queue.length - 1] : gameRef.current.dir;
      if (dir === last || dir === OPPOSITE[last]) return;
      if (queue.length >= MAX_QUEUED_TURNS) return;
      queue.push(dir);
      if (current === 'ready') updatePhase('playing');
    },
    [updatePhase]
  );

  // Un pas de jeu à chaque tic ; le tic se raccourcit quand le score monte.
  const speed = speedFor(game.score);
  useEffect(() => {
    if (phase !== 'playing') return;
    const interval = setInterval(() => {
      const current = gameRef.current;
      const requested = queueRef.current.shift() ?? current.dir;
      const next = step(current, requested);
      if (next.snake !== current.snake) advancePositions(current.snake, next.snake, speedFor(next.score));
      gameRef.current = next;
      setGame(next);
      if (next.status !== 'playing') {
        clearInterval(interval);
        finish(next.score);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [phase, speed, finish, advancePositions]);

  // App mise en arrière-plan (appel, notification...) : partie mise en pause, jamais perdue.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status !== 'active' && phaseRef.current === 'playing') updatePhase('paused');
    });
    return () => subscription.remove();
  }, [updatePhase]);

  // Glisser le doigt n'importe où dans la zone de jeu : le geste peut s'enchaîner sans lever le doigt.
  const panResponder = useMemo(() => {
    const anchor = { x: 0, y: 0 };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        anchor.x = 0;
        anchor.y = 0;
      },
      onPanResponderMove: (_event, gesture) => {
        // Avant le départ, seul un appui démarre la partie : un glissement ne fait rien.
        if (phaseRef.current === 'ready') return;
        const dx = gesture.dx - anchor.x;
        const dy = gesture.dy - anchor.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
        const dir: Direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        handleInput(dir);
        anchor.x = gesture.dx;
        anchor.y = gesture.dy;
      },
      // Un simple appui sur l'écran des consignes lance la partie.
      onPanResponderRelease: (_event, gesture) => {
        if (
          phaseRef.current === 'ready' &&
          Math.abs(gesture.dx) < SWIPE_THRESHOLD &&
          Math.abs(gesture.dy) < SWIPE_THRESHOLD
        ) {
          updatePhase('playing');
        }
      },
    });
  }, [handleInput, updatePhase]);

  const onAreaLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea((prev) => (prev && prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  };

  // La grille s'adapte à la place réellement disponible (petits écrans compris).
  const cell = area ? Math.floor(Math.min((area.w - spacing.xl * 2) / COLS, area.h / ROWS)) : 0;
  cellRef.current = cell;

  // Taille d'écran connue ou modifiée : on replace les segments à leur vraie position en pixels.
  useEffect(() => {
    if (cell > 0) snapPositions(gameRef.current.snake);
  }, [cell, snapPositions]);

  const boardW = cell * COLS;
  const boardH = cell * ROWS;
  const segmentSize = cell - SEGMENT_INSET * 2;
  const eyeSize = Math.max(3, segmentSize * 0.2);

  const togglePause = () => {
    if (phaseRef.current === 'playing') updatePhase('paused');
    else if (phaseRef.current === 'paused') updatePhase('playing');
  };

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Snake</Text>
        <TouchableOpacity
          onPress={togglePause}
          style={styles.iconButton}
          accessibilityLabel={phase === 'paused' ? 'Reprendre' : 'Pause'}
          disabled={phase !== 'playing' && phase !== 'paused'}
        >
          <Ionicons
            name={phase === 'paused' ? 'play' : 'pause'}
            size={22}
            color={phase === 'playing' || phase === 'paused' ? colors.text : colors.border}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{game.score}</Text>
          <Text style={styles.statLabel}>Score</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{best}</Text>
          <Text style={styles.statLabel}>Record</Text>
        </View>
      </View>

      <View style={styles.playArea} onLayout={onAreaLayout} {...panResponder.panHandlers}>
        {cell > 0 ? (
          <View style={[styles.board, { width: boardW, height: boardH }]}>
            {game.food ? <FoodLogo x={game.food.x} y={game.food.y} cell={cell} /> : null}

            {game.snake.map((_, index) => {
              const position = positionsRef.current[index];
              if (!position) return null;
              const isHead = index === 0;
              return (
                <Animated.View
                  key={index}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: segmentSize,
                    height: segmentSize,
                    borderRadius: segmentSize * (isHead ? 0.38 : 0.3),
                    backgroundColor: isHead ? SNAKE_HEAD : SNAKE_BODY,
                    transform: position.getTranslateTransform(),
                  }}
                >
                  {isHead
                    ? EYES[game.dir].map(([ex, ey], i) => (
                        <View
                          key={i}
                          style={{
                            position: 'absolute',
                            left: ex * segmentSize - eyeSize / 2,
                            top: ey * segmentSize - eyeSize / 2,
                            width: eyeSize,
                            height: eyeSize,
                            borderRadius: eyeSize / 2,
                            backgroundColor: colors.white,
                          }}
                        />
                      ))
                    : null}
                </Animated.View>
              );
            })}

            {phase === 'ready' ? (
              <View style={styles.boardOverlay} pointerEvents="none">
                <Text style={styles.overlayTitle}>Prêt ?</Text>
                <Text style={styles.overlayText}>Touche l'écran pour démarrer, puis glisse le doigt ou utilise les flèches.</Text>
              </View>
            ) : null}

            {phase === 'paused' ? (
              <TouchableOpacity style={styles.boardOverlay} activeOpacity={1} onPress={togglePause}>
                <Ionicons name="play-circle" size={54} color={colors.white} />
                <Text style={styles.overlayText}>Pause : touche pour reprendre</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.dpad}>
        <View style={styles.dpadTop}>
          <DpadButton dir="up" icon="chevron-up" onPress={handleInput} />
        </View>
        <View style={styles.dpadBottom}>
          <DpadButton dir="left" icon="chevron-back" onPress={handleInput} />
          <DpadButton dir="down" icon="chevron-down" onPress={handleInput} />
          <DpadButton dir="right" icon="chevron-forward" onPress={handleInput} />
        </View>
      </View>

      {phase === 'ended' ? (
        <View style={styles.endOverlay}>
          <View style={styles.endPanel}>
            <Text style={styles.endEmoji}>{game.status === 'won' ? '🏆' : '💥'}</Text>
            <Text style={styles.endTitle}>{game.status === 'won' ? 'Grille complète !' : 'Perdu !'}</Text>
            <Text style={styles.endText}>
              {game.score} logo{game.score > 1 ? 's' : ''} mangé{game.score > 1 ? 's' : ''}
            </Text>
            {newRecord ? <Text style={styles.recordText}>Nouveau record !</Text> : null}
            <TouchableOpacity style={styles.primaryButton} onPress={restart}>
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

// Réagit dès le contact du doigt (onPressIn) : plus vif qu'un appui complet, important pour un jeu.
// La touche change de couleur pendant l'appui (et reste allumée un court instant, pour qu'un appui
// très bref soit quand même visible).
const HIGHLIGHT_MIN_MS = 120;

const DpadButton: React.FC<{ dir: Direction; icon: string; onPress: (dir: Direction) => void }> = ({
  dir,
  icon,
  onPress,
}) => {
  const [pressed, setPressed] = useState(false);
  const pressedAt = useRef(0);
  const offTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (offTimer.current) clearTimeout(offTimer.current);
    },
    []
  );

  return (
    <Pressable
      style={[styles.dpadButton, pressed && styles.dpadButtonPressed]}
      onPressIn={() => {
        if (offTimer.current) clearTimeout(offTimer.current);
        pressedAt.current = Date.now();
        setPressed(true);
        onPress(dir);
      }}
      onPressOut={() => {
        const remaining = Math.max(0, HIGHLIGHT_MIN_MS - (Date.now() - pressedAt.current));
        offTimer.current = setTimeout(() => setPressed(false), remaining);
      }}
      accessibilityLabel={`Aller ${{ up: 'en haut', down: 'en bas', left: 'à gauche', right: 'à droite' }[dir]}`}
    >
      <Ionicons name={icon as any} size={30} color={pressed ? colors.white : colors.primary} />
    </Pressable>
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
  stats: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  statBox: { flex: 1, backgroundColor: colors.white, borderRadius: 14, paddingVertical: spacing.md, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: colors.primary },
  statLabel: { fontSize: 11, fontWeight: '700', color: colors.textLight, marginTop: 2 },
  playArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  board: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  boardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,26,74,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  overlayTitle: { fontSize: 24, fontWeight: '900', color: colors.white },
  overlayText: { fontSize: 14, color: colors.white, textAlign: 'center', marginTop: spacing.sm },
  dpad: { alignItems: 'center', paddingVertical: spacing.md },
  dpadTop: { flexDirection: 'row' },
  dpadBottom: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  dpadButton: {
    width: 64,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dpadButtonPressed: { backgroundColor: colors.primary, borderColor: colors.primary },
  endOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,26,74,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  endPanel: { width: '100%', backgroundColor: colors.white, borderRadius: 24, padding: spacing.xl, alignItems: 'center' },
  endEmoji: { fontSize: 44 },
  endTitle: { fontSize: 24, fontWeight: '900', color: colors.text, marginTop: spacing.sm },
  endText: { fontSize: 15, color: colors.textLight, marginTop: spacing.sm },
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
