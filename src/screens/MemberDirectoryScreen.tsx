import React, { useState, useMemo } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { memberSpaceService, DirectoryMember } from '../services/memberSpaceService';
import { useRemote } from '../hooks/useRemote';
import { useAuth } from '../contexts/AuthContext';
import { ErrorState } from '../components/ErrorState';
import { DetailSheet, SheetAction, sheetStyles } from '../components/DetailSheet';
import { openMail } from '../utils/links';

export const MemberDirectoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { data: members, loading, refreshing, error, refresh, retry } = useRemote<DirectoryMember[]>(
    () => memberSpaceService.getDirectory(),
    []
  );
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<DirectoryMember | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [m.full_name, m.position_in_association, m.graduation_year ? String(m.graduation_year) : '']
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [members, query]);

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
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={refresh}
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
        ListEmptyComponent={
          error ? (
            <ErrorState onRetry={retry} />
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
              {user?.associationName ? <Text style={styles.assoLine}>{user.associationName}</Text> : null}
              {item.position_in_association ? (
                <Text style={styles.memberPosition}>{item.position_in_association}</Text>
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
            {user?.associationName ? <Text style={sheetStyles.meta}>{user.associationName}</Text> : null}
            {selected.position_in_association ? (
              <Text style={sheetStyles.meta}>{selected.position_in_association}</Text>
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
  memberPosition: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  memberYear: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
});
