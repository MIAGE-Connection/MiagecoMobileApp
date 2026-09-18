import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar, ActivityIndicator, Image, ImageBackground, Alert, Modal, TextInput } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Ionicons } from '@expo/vector-icons';
import { associationService, Association } from '../services/associationService';
import { authService } from '../services/authService';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Toast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';

export const AdminDashboardScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const [association, setAssociation] = useState<Association | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileForm, setProfileForm] = useState({
    position_in_association: user?.position_in_association || '',
    contact_email: user?.contact_email || '',
    graduation_year: user?.graduation_year?.toString() || '',
  });
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

  const handleBannerUpload = async () => {
    try {
      setUploadingBanner(true);
      const imageUri = await associationService.pickImage();

      if (imageUri) {
        const bannerUrl = await associationService.uploadAssociationBanner(user.associationId, imageUri);
        if (bannerUrl && association) {
          setAssociation({ ...association, banner_url: bannerUrl });
          showToast('Bannière mise à jour avec succès', 'success');
        }
      }
    } catch (error) {
      console.error('Error uploading banner:', error);
      showToast('Erreur lors du téléchargement', 'error');
    } finally {
      setUploadingBanner(false);
    }
  };

  const updateProfileField = (field: string, value: string) => {
    setProfileForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleProfileSave = async () => {
    try {
      setSavingProfile(true);
      const profileData = {
        position_in_association: profileForm.position_in_association,
        contact_email: profileForm.contact_email,
        graduation_year: profileForm.graduation_year ? parseInt(profileForm.graduation_year, 10) : undefined,
      };

      await authService.updateUserProfile(profileData);
      showToast('Profil mis à jour', 'success');
      setProfileModalVisible(false);
    } catch (error) {
      console.error('Error:', error);
      showToast('Impossible de sauvegarder le profil', 'error');
    } finally {
      setSavingProfile(false);
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSubtitle}>ESPACE ADMINISTRATEUR</Text>
            <Text style={styles.headerTitle}>Bonjour {user.email.split('@')[0]} <Text style={styles.emoji}>👋</Text></Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => setProfileModalVisible(true)}
            >
              <Text style={styles.avatarText}>{user.email.substring(0, 2).toUpperCase()}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerLogoutButton} onPress={signOut}>
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Card (référent d'association uniquement) */}
        {user.role === 'admin_association' && (
        <>
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.banner}
            onPress={handleBannerUpload}
            disabled={uploadingBanner}
          >
            {association?.banner_url ? (
              <Image source={{ uri: association.banner_url }} style={styles.bannerImage} />
            ) : (
              <View style={styles.bannerOverlay}>
                <Text style={styles.bannerText}>bannière asso</Text>
              </View>
            )}
            {uploadingBanner && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color={colors.white} />
              </View>
            )}
            {!uploadingBanner && (
              <View style={styles.bannerEditIcon}>
                <Ionicons name="camera" size={20} color={colors.white} />
              </View>
            )}
          </TouchableOpacity>

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
              <TouchableOpacity style={styles.qrButton}>
                <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{association?.members_count || 0}</Text>
            <Text style={styles.statLabel}>Adhérents</Text>
            <View style={styles.statTagGreen}>
              <Text style={styles.statTagTextGreen}>+0</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{association?.mandate_events_count || 0}</Text>
            <Text style={styles.statLabel}>Événements</Text>
            <View style={styles.statTagBlue}>
              <Text style={styles.statTagTextBlue}>MOIS</Text>
            </View>
          </View>
        </View>
        </>
        )}

        {/* Actions rôle */}
        <View style={styles.roleActionsRow}>
          <TouchableOpacity
            style={styles.roleActionButton}
            onPress={() => navigation.navigate('NotificationPreferences')}
          >
            <Ionicons name="notifications-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.roleActionText}>Notifications</Text>
          </TouchableOpacity>

          {user.role === 'admin_association' && (
            <TouchableOpacity
              style={styles.roleActionButton}
              onPress={() => navigation.navigate('Members')}
            >
              <Ionicons name="people-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.roleActionText}>Mes membres</Text>
            </TouchableOpacity>
          )}

          {user.role === 'admin_national' && (
            <>
              <TouchableOpacity
                style={styles.roleActionButton}
                onPress={() => navigation.navigate('Domains')}
              >
                <Ionicons name="globe-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.roleActionText}>Domaines</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.roleActionButton}
                onPress={() => navigation.navigate('AdminAssociations')}
              >
                <Ionicons name="business-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.roleActionText}>Associations</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.roleActionButton}
                onPress={() => navigation.navigate('SendNotification')}
              >
                <Ionicons name="megaphone-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.roleActionText}>Diffuser une notif</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Info Section (référent d'association uniquement) */}
        {user.role === 'admin_association' && (
        <>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Informations publiées</Text>

        </View>

        <View style={styles.infoList}>
          <TouchableOpacity style={styles.infoItem}>
            <View style={styles.infoIconBox}>
              <Ionicons name="mail-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Email contact</Text>
              <Text style={styles.infoValue}>{association?.email_contact || 'Non renseigné'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.border} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.infoItem}>
            <View style={styles.infoIconBox}>
              <Ionicons name="globe-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Site web</Text>
              <Text style={styles.infoValue}>{association?.website_url || 'Non renseigné'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.border} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.infoItem}>
            <View style={styles.infoIconBox}>
              <Ionicons name="logo-instagram" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Instagram</Text>
              <Text style={styles.infoValue}>{association?.instagram_username || 'Non renseigné'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.border} />
          </TouchableOpacity>
        </View>
        </>
        )}

        <TouchableOpacity
          onPress={signOut}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>Se déconnecter de l'espace admin</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={profileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mon profil</Text>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.label}>Poste dans l'association</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Président"
                  value={profileForm.position_in_association}
                  onChangeText={(value) => updateProfileField('position_in_association', value)}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.label}>Email de contact personnel</Text>
                <TextInput
                  style={styles.input}
                  placeholder="contact@example.com"
                  keyboardType="email-address"
                  value={profileForm.contact_email}
                  onChangeText={(value) => updateProfileField('contact_email', value)}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.label}>Année de promotion</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 2024"
                  keyboardType="number-pad"
                  value={profileForm.graduation_year}
                  onChangeText={(value) => updateProfileField('graduation_year', value)}
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleProfileSave}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.modalSaveButtonText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
  },
  emoji: {
    fontSize: 22,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FDECEC',
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
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  bannerText: {
    fontSize: 12,
    color: 'rgba(79, 70, 229, 0.3)',
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
    fontSize: 10,
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
  qrButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 10,
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
    fontSize: 9,
    fontWeight: '800',
  },
  statTagBlue: {
    backgroundColor: '#F1F3FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statTagTextBlue: {
    color: colors.primary,
    fontSize: 9,
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
    fontSize: 9,
    fontWeight: '800',
  },
  roleActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  roleActionButton: {
    flex: 1,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  roleActionText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 10,
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
    backgroundColor: '#F1F3FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: colors.textLight,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  logoutButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  logoutText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
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
