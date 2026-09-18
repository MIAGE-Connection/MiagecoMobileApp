import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { useAuth } from '../contexts/AuthContext';
import { NewContentKind } from '../services/newContentService';
import { useNewCounts } from '../hooks/useNewCounts';

const SECTIONS: { key: string; icon: keyof typeof Ionicons.glyphMap; label: string; route: string; newKind?: NewContentKind }[] = [
  { key: 'directory', icon: 'people-outline', label: 'Annuaire des adhérents', route: 'MemberDirectory' },
  { key: 'documents', icon: 'document-text-outline', label: 'Documents', route: 'MemberDocuments', newKind: 'member_documents' },
  { key: 'notifications', icon: 'notifications-outline', label: 'Notifications', route: 'NotificationInbox', newKind: 'notification_history' },
  { key: 'mydata', icon: 'shield-checkmark-outline', label: 'Mes données', route: 'MyData' },
];

const LEGAL_LINKS: { key: string; label: string; documentKey: 'cgu' | 'confidentialite' | 'mentions_legales' }[] = [
  { key: 'cgu', label: 'CGU', documentKey: 'cgu' },
  { key: 'confidentialite', label: 'Confidentialité', documentKey: 'confidentialite' },
  { key: 'mentions', label: 'Mentions légales', documentKey: 'mentions_legales' },
];

export const MemberHomeScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const { counts: newCounts } = useNewCounts();

  const daysLeft = user?.validUntil
    ? Math.ceil((new Date(user.validUntil).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null;
  const expiresSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;

  const handleSignOut = () => {
    Alert.alert('Se déconnecter', 'Veux-tu vraiment te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.roleBadge}>
              <Ionicons name="school-outline" size={12} color={colors.white} style={{ marginRight: 4 }} />
              <Text style={styles.roleBadgeText}>ESPACE ADHÉRENT</Text>
            </View>
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => navigation.navigate('EditProfile')}
              accessibilityLabel="Modifier mon profil"
            >
              <Text style={styles.avatarText}>{(user?.email || '??').substring(0, 2).toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Bonjour {user?.email.split('@')[0]} <Text style={styles.emoji}>👋</Text>
          </Text>
          {user?.associationName ? (
            <Text style={styles.associationName}>{user.associationName}</Text>
          ) : null}
        </View>

        <View style={styles.body}>
          {expiresSoon && (
            <View style={styles.expiryBanner}>
              <Ionicons name="time-outline" size={18} color="#8A5A00" style={{ marginRight: 10 }} />
              <Text style={styles.expiryText}>
                Ton adhésion expire le {new Date(user!.validUntil!).toLocaleDateString('fr-FR')}. Après cette date, un
                renouvellement en un geste te sera proposé.
              </Text>
            </View>
          )}
          <View style={styles.grid}>
            {SECTIONS.map((section) => (
              <TouchableOpacity
                key={section.key}
                style={styles.card}
                onPress={() => navigation.navigate(section.route)}
                activeOpacity={0.7}
              >
                <View style={styles.cardIconBox}>
                  <Ionicons name={section.icon} size={22} color={colors.primary} />
                </View>
                <Text style={styles.cardLabel}>{section.label}</Text>
                {section.newKind && newCounts[section.newKind] > 0 ? (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>{newCounts[section.newKind]}</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={16} color={colors.border} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.legalRow}>
            {LEGAL_LINKS.map((link, index) => (
              <React.Fragment key={link.key}>
                <TouchableOpacity onPress={() => navigation.navigate('LegalDocument', { documentKey: link.documentKey })}>
                  <Text style={styles.legalLinkText}>{link.label}</Text>
                </TouchableOpacity>
                {index < LEGAL_LINKS.length - 1 && <Text style={styles.legalSeparator}>·</Text>}
              </React.Fragment>
            ))}
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  hero: {
    backgroundColor: colors.primary,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 50) + spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: spacing.xl,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.white,
  },
  emoji: {
    fontSize: 22,
  },
  associationName: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  body: {
    paddingHorizontal: spacing.xl,
  },
  grid: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  expiryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF6E0',
    borderColor: '#F4D58A',
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  expiryText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#6B4700', fontWeight: '600' },
  newBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: spacing.sm,
  },
  newBadgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  legalLinkText: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '600',
  },
  legalSeparator: {
    fontSize: 11,
    color: colors.textLight,
    marginHorizontal: spacing.sm,
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
});
