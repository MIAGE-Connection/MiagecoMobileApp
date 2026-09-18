import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { useAuth } from '../contexts/AuthContext';
import { membersService, Member } from '../services/membersService';

const ROLE_LABELS: Record<Member['role'], string> = {
  member: 'Adhérent',
  admin_association: 'Référent',
  admin_national: 'Admin fédération',
};

export const MembersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Un admin national peut ouvrir cet écran depuis "Associations" avec une
  // asso ciblée ; un référent le voit toujours pour sa propre asso.
  const associationId: string | undefined = route.params?.associationId || user?.associationId;
  const associationName: string | undefined = route.params?.associationName;
  const canManageRoles = user?.role === 'admin_national';

  const load = useCallback(async () => {
    if (!associationId) {
      setLoading(false);
      return;
    }
    try {
      const data = await membersService.getMembersForAssociation(associationId);
      setMembers(data);
    } catch (error) {
      console.error('MembersScreen: load error', error);
      Alert.alert('Erreur', 'Impossible de charger les membres.');
    } finally {
      setLoading(false);
    }
  }, [associationId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleToggleReferent = (item: Member) => {
    const isReferent = item.role === 'admin_association';
    const nextRole = isReferent ? 'member' : 'admin_association';
    const actionLabel = isReferent ? 'retirer le rôle de référent à' : 'nommer référent';

    Alert.alert(
      isReferent ? 'Retirer le rôle de référent ?' : 'Nommer référent ?',
      `Confirmer : ${actionLabel} ${item.full_name || item.email} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: isReferent ? 'destructive' : 'default',
          onPress: async () => {
            setUpdatingId(item.id);
            try {
              await membersService.setReferentRole(item.id, nextRole);
              load();
            } catch (error) {
              console.error('MembersScreen: role update error', error);
              Alert.alert('Erreur', 'Impossible de modifier ce rôle.');
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
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
        <Text style={styles.headerTitle}>{associationName || 'Mes membres'}</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucun membre pour le moment.</Text>}
        renderItem={({ item }) => {
          const isSelf = item.id === user?.id;
          const canToggle = canManageRoles && !isSelf && item.role !== 'admin_national';

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
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    width: 36,
    height: 36,
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
    backgroundColor: '#F1F3FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 10,
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
    fontSize: 10,
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
    fontSize: 9,
    color: colors.primary,
    fontWeight: '700',
  },
});
