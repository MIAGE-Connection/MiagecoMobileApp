import React, { useState, useCallback, useMemo } from 'react';
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
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { useAuth } from '../contexts/AuthContext';
import { membersService, Member } from '../services/membersService';
import { domainsService } from '../services/domainsService';

const ROLE_LABELS: Record<Member['role'], string> = {
  member: 'Adhérent',
  admin_association: 'Référent',
  admin_national: 'Admin fédération',
};

export const MembersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, refresh } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [domains, setDomains] = useState<string[]>([]);

  // Un admin national peut ouvrir cet écran depuis "Associations" avec une
  // asso ciblée ; un référent le voit toujours pour sa propre asso.
  const associationId: string | undefined = route.params?.associationId || user?.associationId;
  const associationName: string | undefined = route.params?.associationName;
  const canManageRoles = user?.role === 'admin_national';
  const isReferent = user?.role === 'admin_association';

  const load = useCallback(async () => {
    if (!associationId) {
      setLoading(false);
      return;
    }
    try {
      const [data, domainRows] = await Promise.all([
        membersService.getMembersForAssociation(associationId),
        domainsService.getAllDomains().catch(() => []),
      ]);
      setMembers(data);
      setDomains(domainRows.filter((d) => d.asso_id === associationId && d.is_active).map((d) => d.domain));
    } catch (error) {
      console.error('MembersScreen: load error', error);
      Alert.alert('Erreur', 'Impossible de charger les membres.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [associationId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const runRoleChange = async (
    item: Member,
    action: () => Promise<void>,
    successMessage: string,
    onDone?: () => void
  ) => {
    setUpdatingId(item.id);
    try {
      await action();
      Alert.alert("C'est fait", successMessage);
      onDone ? onDone() : load();
    } catch (error: any) {
      console.error('MembersScreen: role update error', error);
      Alert.alert('Erreur', error?.message || 'Impossible de modifier ce rôle.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Admin fédération : nommer (remplace l'éventuel référent en place) ou retirer.
  const handleToggleReferent = (item: Member) => {
    const name = item.full_name || item.email;
    if (item.role === 'admin_association') {
      Alert.alert('Retirer le rôle de référent ?', `${name} redeviendra simple adhérent.`, [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: () =>
            runRoleChange(item, () => membersService.setReferentRole(item.id, 'member'), `${name} n'est plus référent.`),
        },
      ]);
      return;
    }
    const current = members.find((m) => m.role === 'admin_association');
    Alert.alert(
      'Nommer référent ?',
      current
        ? `${name} deviendra référent. ${current.full_name || current.email} redeviendra simple adhérent (un seul référent par association).`
        : `${name} deviendra référent de l'association.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Nommer',
          onPress: () =>
            runRoleChange(item, () => membersService.assignReferent(item.id), `${name} est maintenant référent.`),
        },
      ]
    );
  };

  // Référent : passe son propre rôle à un autre adhérent de l'association.
  const handleTransfer = (item: Member) => {
    Alert.alert(
      'Passer le rôle de référent ?',
      `${item.full_name || item.email} deviendra référent et tu redeviendras simple adhérent. Tu perdras l'accès à l'espace d'administration de l'association.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Transférer',
          style: 'destructive',
          onPress: () =>
            runRoleChange(item, () => membersService.assignReferent(item.id), 'Le rôle de référent a été transféré.', () => {
              // Le rôle a changé : on recharge la session, la navigation bascule
              // automatiquement sur l'espace adhérent.
              refresh();
            }),
        },
      ]
    );
  };

  const handleToggleSuspended = (item: Member) => {
    const name = item.full_name || item.email;
    const suspending = !item.is_suspended;
    Alert.alert(
      suspending ? 'Suspendre ce membre ?' : 'Réactiver ce membre ?',
      suspending
        ? `${name} perdra l'accès à l'espace adhérent jusqu'à sa réactivation.`
        : `${name} retrouvera l'accès à l'espace adhérent.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: suspending ? 'Suspendre' : 'Réactiver',
          style: suspending ? 'destructive' : 'default',
          onPress: () =>
            runRoleChange(
              item,
              () => membersService.setSuspended(item.id, suspending),
              suspending ? `${name} est suspendu.` : `${name} est réactivé.`
            ),
        },
      ]
    );
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [m.full_name, m.email, m.position_in_association].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
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
        <Text style={styles.headerTitle}>{associationName || 'Mes membres'}</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load();
        }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            {domains.length > 0 && (
              <View style={styles.domainsBox}>
                <Ionicons name="globe-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.domainsText}>Adresses autorisées : {domains.map((d) => `@${d}`).join(', ')}</Text>
              </View>
            )}
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={colors.textLight} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un membre…"
                placeholderTextColor={colors.textLight}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>{query ? 'Aucun résultat.' : 'Aucun membre pour le moment.'}</Text>
        }
        renderItem={({ item }) => {
          const isSelf = item.id === user?.id;
          const canToggle = canManageRoles && !isSelf && item.role !== 'admin_national';
          const canTransfer = isReferent && !isSelf && item.role === 'member' && !item.is_suspended;

          return (
            <View style={styles.memberCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.email.substring(0, 2).toUpperCase()}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.full_name || item.email}</Text>
                <Text style={styles.memberEmail}>{item.email}</Text>
                {item.position_in_association ? (
                  <Text style={styles.memberPosition}>{item.position_in_association}</Text>
                ) : null}
              </View>
              <View style={styles.badges}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{ROLE_LABELS[item.role]}</Text>
                </View>
                {item.is_suspended && (
                  <View style={styles.suspendedBadge}>
                    <Text style={styles.suspendedBadgeText}>Suspendu</Text>
                  </View>
                )}
                {canToggle && (
                  <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={() => handleToggleReferent(item)}
                    disabled={updatingId === item.id}
                  >
                    {updatingId === item.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={styles.toggleButtonText}>
                        {item.role === 'admin_association' ? 'Retirer référent' : 'Nommer référent'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
                {canManageRoles && !isSelf && item.role !== 'admin_national' && (
                  <TouchableOpacity
                    style={[styles.toggleButton, item.is_suspended ? null : styles.suspendButton]}
                    onPress={() => handleToggleSuspended(item)}
                    disabled={updatingId === item.id}
                  >
                    <Text style={[styles.toggleButtonText, item.is_suspended ? null : styles.suspendButtonText]}>
                      {item.is_suspended ? 'Réactiver' : 'Suspendre'}
                    </Text>
                  </TouchableOpacity>
                )}
                {canTransfer && (
                  <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={() => handleTransfer(item)}
                    disabled={updatingId === item.id}
                  >
                    {updatingId === item.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={styles.toggleButtonText}>Passer le rôle</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  domainsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  domainsText: { flex: 1, fontSize: 12, color: colors.text, fontWeight: '600' },
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
  suspendButton: { borderColor: colors.error },
  suspendButtonText: { color: colors.error },
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
  memberEmail: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  memberPosition: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  badges: {
    alignItems: 'flex-end',
    gap: 4,
  },
  roleBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  suspendedBadge: {
    backgroundColor: '#FDECEC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  suspendedBadgeText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: '700',
  },
  toggleButton: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  toggleButtonText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
});
