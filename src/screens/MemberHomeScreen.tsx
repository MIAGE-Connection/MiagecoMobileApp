import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { useAuth } from '../contexts/AuthContext';

const SECTIONS: { key: string; icon: keyof typeof Ionicons.glyphMap; label: string; route: string }[] = [
  { key: 'directory', icon: 'people-outline', label: 'Annuaire des adhérents', route: 'MemberDirectory' },
  { key: 'documents', icon: 'document-text-outline', label: 'Documents', route: 'MemberDocuments' },
  { key: 'calendar', icon: 'calendar-outline', label: 'Agenda fédéral', route: 'FederalCalendar' },
  { key: 'announcements', icon: 'megaphone-outline', label: 'Annonces', route: 'Announcements' },
  { key: 'notifications', icon: 'notifications-outline', label: 'Notifications', route: 'NotificationPreferences' },
];

export const MemberHomeScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>ESPACE ADHÉRENT</Text>
          <Text style={styles.headerTitle}>Bonjour {user?.email.split('@')[0]} <Text style={styles.emoji}>👋</Text></Text>
          <Text style={styles.associationName}>{user?.associationName}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {SECTIONS.map((section) => (
          <TouchableOpacity
            key={section.key}
            style={styles.card}
            onPress={() => navigation.navigate(section.route)}
          >
            <View style={styles.cardIconBox}>
              <Ionicons name={section.icon} size={22} color={colors.primary} />
            </View>
            <Text style={styles.cardLabel}>{section.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.border} />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
  },
  emoji: {
    fontSize: 20,
  },
  associationName: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 4,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FDECEC',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#F1F3FE',
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
});
