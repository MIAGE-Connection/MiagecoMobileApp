import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { memberSpaceService, DirectoryMember } from '../services/memberSpaceService';
import { ErrorState } from '../components/ErrorState';
import { DetailSheet, SheetAction, sheetStyles } from '../components/DetailSheet';
import { openMail } from '../utils/links';
import { PositionBadge } from '../components/PositionBadge';

export const MemberDirectoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState(''); // saisie « retardée » : une requête par pause de frappe, pas par lettre
  const [selected, setSelected] = useState<DirectoryMember | null>(null);
  // Une réponse arrivée après une nouvelle recherche est ignorée (sinon elle écraserait la liste à jour).
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const loadFirst = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const page = await memberSpaceService.getDirectoryPage(0, search);
      if (id !== requestId.current) return;
      setMembers(page.rows);
      setHasMore(page.hasMore);
      setError(false);
    } catch (e) {
      if (id !== requestId.current) return;
      console.error('MemberDirectoryScreen: load error', e);
      setError(true);
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [search]);

  // Rechargé à chaque ouverture de l'écran et à chaque nouvelle recherche.
  useFocusEffect(
    useCallback(() => {
      loadFirst();
    }, [loadFirst])
  );

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const page = await memberSpaceService.getDirectoryPage(members.length, search);
      if (id !== requestId.current) return;
      setMembers((current) => [...current, ...page.rows.filter((row) => !current.some((c) => c.id === row.id))]);
      setHasMore(page.hasMore);
    } catch (e) {
      console.error('MemberDirectoryScreen: load more error', e);
    } finally {
      setLoadingMore(false);
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Annuaire des adhérents</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          loadFirst();
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={colors.textLight} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un adhérent…"
              placeholderTextColor={colors.textLight}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
          </View>
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={{ marginVertical: spacing.lg }} color={colors.primary} /> : null
        }
        ListEmptyComponent={
          error ? (
            <ErrorState onRetry={loadFirst} />
          ) : (
            <Text style={styles.emptyText}>{query ? 'Aucun résultat.' : 'Aucun adhérent pour le moment.'}</Text>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.memberCard} onPress={() => setSelected(item)} activeOpacity={0.8}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(item.full_name || '??').substring(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.memberInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.memberName}>{item.full_name || 'Adhérent'}</Text>
                {item.is_referent ? (
                  <View style={styles.referentBadge}>
                    <Text style={styles.referentBadgeText}>Référent</Text>
                  </View>
                ) : null}
              </View>
              {item.association_name ? <Text style={styles.assoLine}>{item.association_name}</Text> : null}
              {item.position_in_association ? (
                <PositionBadge label={item.position_in_association} color={item.position_color} />
              ) : null}
              {item.graduation_year ? (
                <Text style={styles.memberYear}>Promo {item.graduation_year}</Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.border} />
          </TouchableOpacity>
        )}
      />

      <DetailSheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <Text style={sheetStyles.title}>{selected.full_name || 'Adhérent'}</Text>
            {selected.is_referent ? (
              <View style={[styles.referentBadge, { alignSelf: 'flex-start', marginTop: 8 }]}>
                <Text style={styles.referentBadgeText}>Référent de l'association</Text>
              </View>
            ) : null}
            {selected.association_name ? <Text style={sheetStyles.meta}>{selected.association_name}</Text> : null}
            {selected.position_in_association ? (
              <PositionBadge label={selected.position_in_association} color={selected.position_color} style={{ marginTop: 8 }} />
            ) : null}
            {selected.graduation_year ? <Text style={sheetStyles.meta}>Promo {selected.graduation_year}</Text> : null}

            {selected.contact_email ? (
              <>
                <Text style={[sheetStyles.body, { fontWeight: '700' }]} selectable>
                  {selected.contact_email}
                </Text>
                <SheetAction label="Écrire un email" primary onPress={() => openMail(selected.contact_email)} />
              </>
            ) : (
              <Text style={sheetStyles.meta}>Cet adhérent n'a pas renseigné d'email de contact.</Text>
            )}
          </>
        )}
      </DetailSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  referentBadge: { backgroundColor: colors.primarySoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  referentBadgeText: { fontSize: 11, fontWeight: '800', color: colors.primary },
  assoLine: { fontSize: 12, color: colors.textLight, marginTop: 1 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: spacing.md },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  listContent: {
    padding: spacing.xl,
    paddingTop: 0,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textLight,
    marginTop: spacing.xl,
  },
  memberCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  memberYear: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
});
