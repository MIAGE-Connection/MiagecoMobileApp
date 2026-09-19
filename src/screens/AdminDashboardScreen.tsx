import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar, ActivityIndicator, Image, ImageBackground, Alert, Modal, TextInput } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Ionicons } from '@expo/vector-icons';
import { associationService, Association } from '../services/associationService';
import { authService } from '../services/authService';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { deletionRequestsService } from '../services/deletionRequestsService';
import { Toast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { useNewCounts } from '../hooks/useNewCounts';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  badge?: number;
  onPress: () => void;
}

const MenuSection: React.FC<{ title: string; items: MenuItem[] }> = ({ title, items }) => (
  <View style={styles.menuSection}>
    <Text style={styles.menuSectionTitle}>{title}</Text>
    <View style={styles.menuCard}>
      {items.map((item, index) => (
        <TouchableOpacity
          key={item.label}
          style={[styles.menuRow, index < items.length - 1 && styles.menuRowDivider]}
          onPress={item.onPress}
          activeOpacity={0.6}
        >
          <View style={styles.menuIconBox}>
            <Ionicons name={item.icon} size={20} color={colors.primary} />
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuLabel}>{item.label}</Text>
            {item.description ? <Text style={styles.menuDescription}>{item.description}</Text> : null}
          </View>
          {item.badge ? (
            <View style={styles.menuBadge}>
              <Text style={styles.menuBadgeText}>{item.badge}</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={16} color={colors.border} />
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

export const AdminDashboardScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const { counts: newCounts } = useNewCounts();

  const handleSignOut = () => {
    Alert.alert('Se déconnecter', 'Veux-tu vraiment te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: signOut },
    ]);
  };
  const [association, setAssociation] = useState<Association | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingDeletions, setPendingDeletions] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      if (user?.associationId) {
        loadAssociation();
      } else {
        setLoading(false);
      }
    }
  }, [isFocused, user?.associationId]);

  useEffect(() => {
    if (isFocused && user?.role === 'admin_national') {
      deletionRequestsService.countPending().then(setPendingDeletions).catch(() => {});
    }
  }, [isFocused, user?.role]);

  if (!user) {
    return null;
  }

  const loadAssociation = async () => {
    console.log('AdminDashboard: Loading association with ID:', user.associationId);
    try {
      const data = await associationService.getAssociationById(user.associationId);
      console.log('AdminDashboard: Data received:', data);
      setAssociation(data);
    } catch (error) {
      console.error('AdminDashboard: Error loading association:', error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <View style={styles.roleBadge}>
              <Ionicons name="shield-checkmark" size={11} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.roleBadgeText}>
                {user.role === 'admin_national' ? 'SUPER ADMIN' : 'RÉFÉRENT D\'ASSO'}
              </Text>
            </View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Bonjour {(user.full_name || user.email.split('@')[0]).split(' ')[0]} <Text style={styles.emoji}>👋</Text>
            </Text>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('EditProfile')}>
            <Text style={styles.avatarText}>{user.email.substring(0, 2).toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Card (référent d'association uniquement) */}
        {user.role === 'admin_association' && (
        <>
        <View style={styles.profileCard}>
          <View style={styles.banner}>
            {association?.banner_url ? (
              <Image source={{ uri: association.banner_url }} style={styles.bannerImage} />
            ) : (
              <View style={styles.bannerOverlay} />
            )}
          </View>

          <View style={styles.cardContent}>
            <View style={styles.logoContainer}>
              <View style={styles.logoSquare}>
                {association?.logo_url ? (
                  <Image source={{ uri: association.logo_url }} style={styles.logoImage} />
                ) : (
                  <Text style={styles.logoText}>{association?.name?.substring(0, 2).toUpperCase() || 'AS'}</Text>
                )}
              </View>
            </View>

            <View style={styles.nameRow}>
              <Text style={styles.assoName}>{association?.name || 'Mon Association'}</Text>
              <View style={styles.activeBadge}>
                <Ionicons name="checkmark" size={10} color={colors.success} style={{ marginRight: 4 }} />
                <Text style={styles.activeText}>ACTIF</Text>
              </View>
            </View>

            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.textLight} style={{ marginRight: 4 }} />
              <Text style={styles.locationText}>{association?.location || 'Localisation non définie'}</Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate('EditAssociation', { associationId: user.associationId })}
              >
                <Ionicons name="create-outline" size={16} color={colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.editButtonText}>Modifier la fiche d'association</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{association?.members_count || 0}</Text>
            <Text style={styles.statLabel}>Adhérents</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{association?.mandate_events_count || 0}</Text>
            <Text style={styles.statLabel}>Événements du mandat</Text>
          </View>
        </View>
        </>
        )}

        {/* Actions par rôle */}
        {user.role === 'admin_association' && (
          <MenuSection
            title="Mon association"
            items={[
              {
                icon: 'people-outline',
                label: 'Mes membres',
                description: "Adhérents rattachés à ton association",
                onPress: () => navigation.navigate('Members'),
              },
              {
                icon: 'calendar-outline',
                label: 'Événements',
                description: 'Ceux de ton association',
                onPress: () => navigation.navigate('ContentManager', { type: 'events' }),
              },
            ]}
          />
        )}

        {user.role === 'admin_association' && (
          <MenuSection
            title="Espace adhérent"
            items={[
              {
                icon: 'people-outline',
                label: 'Annuaire des adhérents',
                onPress: () => navigation.navigate('MemberDirectory'),
              },
              {
                icon: 'folder-open-outline',
                label: 'Documents adhérents',
                badge: newCounts.member_documents,
                description: 'Consulter les documents partagés',
                onPress: () => navigation.navigate('MemberDocuments'),
              },
            ]}
          />
        )}

        {user.role === 'admin_national' && (
          <>
            <MenuSection
              title="Contenus de l'app"
              items={[
                {
                  icon: 'calendar-outline',
                  label: 'Événements à venir',
                  description: "Créer, modifier, publier les événements",
                  onPress: () => navigation.navigate('ContentManager', { type: 'events' }),
                },
                {
                  icon: 'logo-instagram',
                  label: 'Actualités',
                  description: "Posts de l'onglet Actualités (Instagram)",
                  onPress: () => navigation.navigate('ContentManager', { type: 'news' }),
                },
                {
                  icon: 'newspaper-outline',
                  label: 'Actu Admin',
                  description: "Actualités de la fédération",
                  onPress: () => navigation.navigate('ContentManager', { type: 'admin_news' }),
                },
                {
                  icon: 'star-outline',
                  label: 'Événement à la une',
                  description: "La grande carte de l'accueil",
                  onPress: () => navigation.navigate('ContentManager', { type: 'featured_events' }),
                },
                {
                  icon: 'document-text-outline',
                  label: 'Documents adhérents',
                  description: 'Documents de la fédération',
                  onPress: () => navigation.navigate('ContentManager', { type: 'member_documents' }),
                },
                {
                  icon: 'stats-chart-outline',
                  label: "Chiffres de l'accueil",
                  description: 'Associations, événements, MIAGistes',
                  onPress: () => navigation.navigate('HomeStats'),
                },
              ]}
            />
            <MenuSection
              title="Communication"
              items={[
                {
                  icon: 'megaphone-outline',
                  label: 'Diffuser une notification',
                  description: 'Envoi immédiat à tous les adhérents',
                  onPress: () => navigation.navigate('SendNotification'),
                },
                {
                  icon: 'time-outline',
                  label: 'Notifications programmées',
                  description: 'Envois planifiés et récurrents',
                  onPress: () => navigation.navigate('ScheduledNotifications'),
                },
                {
                  icon: 'list-outline',
                  label: 'Historique des envois',
                  description: 'Notifications déjà parties',
                  onPress: () => navigation.navigate('NotificationHistory'),
                },
              ]}
            />
            <MenuSection
              title="Fédération"
              items={[
                {
                  icon: 'globe-outline',
                  label: 'Domaines autorisés',
                  description: "Adresses email donnant accès à l'app",
                  onPress: () => navigation.navigate('Domains'),
                },
                {
                  icon: 'time-outline',
                  label: 'Journal des domaines',
                  description: 'Qui a activé ou désactivé quoi',
                  onPress: () => navigation.navigate('DomainAuditLog'),
                },
                {
                  icon: 'business-outline',
                  label: 'Associations et référents',
                  description: 'Nommer ou retirer un référent',
                  onPress: () => navigation.navigate('AdminAssociations'),
                },
                {
                  icon: 'person-remove-outline',
                  label: 'Demandes de suppression',
                  description:
                    pendingDeletions > 0
                      ? `${pendingDeletions} demande${pendingDeletions > 1 ? 's' : ''} en attente`
                      : 'Droit à l’effacement (RGPD)',
                  onPress: () => navigation.navigate('DeletionRequests'),
                },
              ]}
            />
          </>
        )}

        <MenuSection
          title="Mon compte"
          items={[
            {
              icon: 'person-circle-outline',
              label: 'Mon profil',
              description: 'Nom, poste, promotion, email de contact',
              onPress: () => navigation.navigate('EditProfile'),
            },
            {
              icon: 'notifications-outline',
              label: 'Mes notifications',
              description: 'Reçues et réglages',
              badge: newCounts.notification_history,
              onPress: () => navigation.navigate('NotificationInbox'),
            },
            {
              icon: 'shield-checkmark-outline',
              label: 'Mes données',
              description: 'Export et suppression du compte',
              onPress: () => navigation.navigate('MyData'),
            },
          ]}
        />

        <MenuSection
          title="Informations légales"
          items={[
            {
              icon: 'document-text-outline',
              label: "Conditions d'utilisation",
              onPress: () => navigation.navigate('LegalDocument', { documentKey: 'cgu' }),
            },
            {
              icon: 'lock-closed-outline',
              label: 'Politique de confidentialité',
              onPress: () => navigation.navigate('LegalDocument', { documentKey: 'confidentialite' }),
            },
            {
              icon: 'business-outline',
              label: 'Mentions légales',
              onPress: () => navigation.navigate('LegalDocument', { documentKey: 'mentions_legales' }),
            },
          ]}
        />

        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>

      <Toast
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
        duration={2500}
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
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerText: {
    flex: 1,
    marginRight: spacing.md,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
  },
  emoji: {
    fontSize: 22,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  banner: {
    height: 100,
    backgroundColor: '#E5E7EB',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(43, 63, 191, 0.1)',
  },
  bannerText: {
    fontSize: 12,
    color: 'rgba(43, 63, 191, 0.3)',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  bannerEditIcon: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  logoContainer: {
    marginTop: -30,
    marginBottom: spacing.md,
  },
  logoSquare: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoText: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  assoName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E1F7EF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  locationText: {
    fontSize: 11,
    color: colors.textLight,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editButton: {
    flex: 1,
    backgroundColor: colors.cardDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
  },
  editButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  statItem: {
    width: '31%',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: 20,
    alignItems: 'flex-start',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginBottom: 8,
  },
  statTagGreen: {
    backgroundColor: '#E1F7EF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statTagTextGreen: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
  },
  statTagBlue: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statTagTextBlue: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  statTagYellow: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statTagTextYellow: {
    color: colors.highlight,
    fontSize: 11,
    fontWeight: '800',
  },
  menuSection: {
    marginBottom: spacing.lg,
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textLight,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  menuCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  menuRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuTextBox: {
    flex: 1,
    marginRight: spacing.sm,
  },
  menuBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  menuBadgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  menuDescription: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  updateText: {
    fontSize: 11,
    color: colors.textLight,
  },
  infoList: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.sm,
    marginBottom: spacing.xl,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FBCACA',
    backgroundColor: '#FEF2F2',
  },
  logoutText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalBody: {
    padding: spacing.xl,
  },
  modalInputGroup: {
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: colors.text,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalSaveButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginVertical: spacing.lg,
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
