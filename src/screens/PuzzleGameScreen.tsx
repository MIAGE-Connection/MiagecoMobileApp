import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
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
import { Grid, PuzzleSize, SIZES, isSolved, shuffled, slide } from '../data/slidingPuzzle';
import { associationLogosService } from '../services/associationLogosService';
import { puzzleGameService, PuzzleBest } from '../services/puzzleGameService';

interface PuzzleImage {
  id: string;
  label: string;
  source: ImageSourcePropType;
}

// Par défaut, le logo de la fédération (icône de l'app) ; les logos des associations s'y ajoutent.
const FEDERATION_IMAGE: PuzzleImage = {
  id: 'federation',
  label: 'Fédération',
  source: require('../../assets/icon.png'),
};

const TILE_GAP = 3;
const MAX_BOARD = 380;
const SLIDE_MS = 110;

const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Un tableau de positions animées, une par tuile (index = valeur de la tuile ; 0 inutilisé).
function buildPositions(grid: Grid, n: number, tile: number): Animated.ValueXY[] {
  const positions: Animated.ValueXY[] = new Array(n * n);
  grid.forEach((value, index) => {
    if (value === 0) return;
    positions[value] = new Animated.ValueXY({
      x: (index % n) * (tile + TILE_GAP),
      y: Math.floor(index / n) * (tile + TILE_GAP),
    });
  });
  return positions;
}

export const PuzzleGameScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [size, setSize] = useState<PuzzleSize>(3);
  const [image, setImage] = useState<PuzzleImage>(FEDERATION_IMAGE);
  const [logoImages, setLogoImages] = useState<PuzzleImage[]>([]);
  const [gameId, setGameId] = useState(0);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [won, setWon] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [best, setBest] = useState<PuzzleBest | null>(null);
  const [newRecord, setNewRecord] = useState(false);

  // Géométrie : la grille tient dans la largeur de l'écran (plafonnée pour les grands écrans).
  const geometry = useCallback(
    (n: number) => {
      const available = Math.min(width - spacing.xl * 2, MAX_BOARD);
      const tile = Math.floor((available - TILE_GAP * (n - 1)) / n);
      return { tile, board: tile * n + TILE_GAP * (n - 1) };
    },
    [width]
  );
  const { tile, board } = geometry(size);

  const [grid, setGrid] = useState<Grid>(() => shuffled(3));
  const gridRef = useRef<Grid>(grid);
  const secondsRef = useRef(0);
  const wonRef = useRef(false);
  const startedRef = useRef(false);
  const movesRef = useRef(0);
  const positionsRef = useRef<Animated.ValueXY[]>([]);
  if (positionsRef.current.length === 0) {
    positionsRef.current = buildPositions(grid, 3, geometry(3).tile);
  }
  const revealOpacity = useRef(new Animated.Value(0)).current;

  const newGame = useCallback(
    (n: PuzzleSize) => {
      const fresh = shuffled(n);
      positionsRef.current = buildPositions(fresh, n, geometry(n).tile);
      gridRef.current = fresh;
      secondsRef.current = 0;
      wonRef.current = false;
      startedRef.current = false;
      movesRef.current = 0;
      revealOpacity.setValue(0);
      setSize(n);
      setGrid(fresh);
      setGameId((id) => id + 1);
      setMoves(0);
      setSeconds(0);
      setStarted(false);
      setWon(false);
      setNewRecord(false);
      setPreviewing(false);
    },
    [geometry, revealOpacity]
  );

  // Changer d'image ou de taille en pleine partie perd la progression : on demande confirmation.
  const confirmRestart = (action: () => void) => {
    if (movesRef.current > 0 && !wonRef.current) {
      Alert.alert('Recommencer ?', 'Ta partie en cours sera perdue.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Recommencer', onPress: action },
      ]);
    } else {
      action();
    }
  };

  useEffect(() => {
    let cancelled = false;
    associationLogosService.loadLogos().then((logos) => {
      if (cancelled) return;
      setLogoImages(logos.map((l) => ({ id: l.id, label: l.name, source: { uri: l.logo_url } })));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    puzzleGameService.getBest(size).then(setBest);
  }, [size]);

  // Chronomètre : démarre au premier coup, s'arrête à la victoire.
  useEffect(() => {
    if (!started || won) return;
    const interval = setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [started, won]);

  const finishGame = useCallback(
    async (finalMoves: number) => {
      wonRef.current = true;
      setWon(true);
      Animated.timing(revealOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      const score = { moves: finalMoves, seconds: secondsRef.current };
      const isRecord = await puzzleGameService.saveIfBest(size, score);
      setNewRecord(isRecord);
      if (isRecord) setBest(score);
    },
    [revealOpacity, size]
  );

  // Toucher une tuile : elle (et celles qui la séparent de la case vide) glissent d'un cran.
  const pressIndex = useCallback(
    (index: number) => {
      if (wonRef.current) return;
      const current = gridRef.current;
      const { grid: next, moved } = slide(current, size, index);
      if (moved === 0) return;

      next.forEach((value, i) => {
        if (value === 0 || value === current[i]) return;
        Animated.timing(positionsRef.current[value], {
          toValue: { x: (i % size) * (tile + TILE_GAP), y: Math.floor(i / size) * (tile + TILE_GAP) },
          duration: SLIDE_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      });

      gridRef.current = next;
      setGrid(next);
      movesRef.current += moved;
      setMoves(movesRef.current);
      if (!startedRef.current) {
        startedRef.current = true;
        setStarted(true);
      }
      if (isSolved(next)) finishGame(movesRef.current);
    },
    [size, tile, finishGame]
  );

  // Le toucher est détecté sur la grille entière (et non sur chaque tuile en mouvement) : fiable pendant l'animation.
  const handleBoardTouch = (x: number, y: number) => {
    const col = Math.min(size - 1, Math.max(0, Math.floor(x / (tile + TILE_GAP))));
    const row = Math.min(size - 1, Math.max(0, Math.floor(y / (tile + TILE_GAP))));
    pressIndex(row * size + col);
  };

  const selectImage = async (option: PuzzleImage) => {
    if (option.id === image.id) return;
    const uri = (option.source as { uri?: string }).uri;
    if (uri) {
      // Le logo doit être chargeable avant de servir de puzzle : sinon la grille resterait vide.
      try {
        await Image.prefetch(uri);
      } catch {
        Alert.alert('Logo indisponible', "Ce logo n'a pas pu être chargé. Vérifie ta connexion ou choisis-en un autre.");
        return;
      }
    }
    confirmRestart(() => {
      setImage(option);
      newGame(size);
    });
  };

  const options = useMemo(() => [FEDERATION_IMAGE, ...logoImages], [logoImages]);
  // Valeurs 1..n²-1 : l'ordre de rendu ne change jamais, seules les positions animées bougent.
  const tileValues = useMemo(() => Array.from({ length: size * size - 1 }, (_, i) => i + 1), [size]);

  // Découpe : la tuile de valeur v montre la portion de l'image qui lui revient dans la grille résolue.
  const renderSlice = (value: number) => {
    const row = Math.floor((value - 1) / size);
    const col = (value - 1) % size;
    return (
      <>
        <Image
          source={image.source}
          resizeMode="contain"
          style={{
            position: 'absolute',
            width: board,
            height: board,
            left: -col * (tile + TILE_GAP),
            top: -row * (tile + TILE_GAP),
          }}
        />
        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.tileBorder]} />
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Taquin</Text>
        <TouchableOpacity
          onPress={() => confirmRestart(() => newGame(size))}
          style={styles.iconButton}
          accessibilityLabel="Nouvelle partie"
        >
          <Ionicons name="shuffle" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

        <View style={[styles.board, { width: board, height: board }]}>
          {tileValues.map((value) => (
            <Animated.View
              key={`${gameId}-${value}`}
              style={[
                styles.tile,
                { width: tile, height: tile, transform: positionsRef.current[value].getTranslateTransform() },
              ]}
            >
              {renderSlice(value)}
            </Animated.View>
          ))}
          {/* La dernière tuile apparaît en fondu à la victoire : l'image est alors complète. */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.tile,
              {
                width: tile,
                height: tile,
                opacity: revealOpacity,
                transform: [
                  { translateX: (size - 1) * (tile + TILE_GAP) },
                  { translateY: (size - 1) * (tile + TILE_GAP) },
                ],
              },
            ]}
          >
            {renderSlice(size * size)}
          </Animated.View>

          {previewing ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.preview]}>
              <Image source={image.source} resizeMode="contain" style={{ width: board, height: board }} />
            </View>
          ) : null}

          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPressIn={(e) => handleBoardTouch(e.nativeEvent.locationX, e.nativeEvent.locationY)}
            accessibilityLabel="Grille du taquin"
          />
        </View>

        <TouchableOpacity
          style={styles.previewButton}
          activeOpacity={0.7}
          onPressIn={() => setPreviewing(true)}
          onPressOut={() => setPreviewing(false)}
          accessibilityLabel="Maintenir pour voir l'image complète"
        >
          <Ionicons name="eye-outline" size={18} color={colors.primary} />
          <Text style={styles.previewText}>Maintiens pour voir l'image</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Image</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
          {options.map((option) => {
            const selected = option.id === image.id;
            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => selectImage(option)}
                style={[styles.thumb, selected && styles.thumbSelected]}
                accessibilityLabel={`Image : ${option.label}`}
              >
                <Image source={option.source} style={styles.thumbImage} resizeMode="contain" />
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionLabel}>Difficulté</Text>
        <View style={styles.sizeRow}>
          {SIZES.map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.sizePill, size === n && styles.sizePillActive]}
              onPress={() => (n === size ? undefined : confirmRestart(() => newGame(n)))}
            >
              <Text style={[styles.sizeText, size === n && styles.sizeTextActive]}>
                {n} × {n}
              </Text>
              <Text style={[styles.sizeSub, size === n && styles.sizeTextActive]}>{n === 3 ? 'Facile' : 'Classique'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {won ? (
        <View style={styles.winOverlay}>
          <View style={styles.winPanel}>
            <Text style={styles.winEmoji}>🧩</Text>
            <Text style={styles.winTitle}>Bien joué !</Text>
            <Text style={styles.winText}>
              {moves} coups en {formatTime(seconds)}
            </Text>
            {newRecord ? <Text style={styles.recordText}>Nouveau record !</Text> : null}
            <TouchableOpacity style={styles.primaryButton} onPress={() => newGame(size)}>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, alignItems: 'center' },
  stats: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg, alignSelf: 'stretch' },
  statBox: { flex: 1, backgroundColor: colors.white, borderRadius: 14, paddingVertical: spacing.md, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: colors.primary },
  statLabel: { fontSize: 11, fontWeight: '700', color: colors.textLight, marginTop: 2 },
  board: { backgroundColor: colors.border, borderRadius: 10, overflow: 'hidden' },
  tile: { position: 'absolute', left: 0, top: 0, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.white },
  tileBorder: { borderRadius: 8, borderWidth: 1, borderColor: 'rgba(14,26,74,0.18)' },
  preview: { backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
  },
  previewText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  sectionLabel: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '800',
    color: colors.textLight,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  thumbs: { gap: spacing.md, paddingRight: spacing.xl },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbSelected: { borderColor: colors.primary },
  thumbImage: { width: 46, height: 46 },
  sizeRow: { flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch' },
  sizePill: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sizeText: { fontSize: 15, fontWeight: '800', color: colors.text },
  sizeSub: { fontSize: 11, fontWeight: '600', color: colors.textLight },
  sizeTextActive: { color: colors.white },
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
