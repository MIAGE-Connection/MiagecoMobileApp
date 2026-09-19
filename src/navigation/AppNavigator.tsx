import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { AssociationsDirectoryScreen } from '../screens/AssociationsDirectoryScreen';
import { EventsFullScreen } from '../screens/EventsFullScreen';
import { ActuAdminScreen } from '../screens/ActuAdminScreen';
import { NewsScreen } from '../screens/NewsScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { AdminDashboardScreen } from '../screens/AdminDashboardScreen';
import { DomainNotAllowedScreen } from '../screens/DomainNotAllowedScreen';
import { MembershipRenewalScreen } from '../screens/MembershipRenewalScreen';
import { MemberHomeScreen } from '../screens/MemberHomeScreen';
import { MembersScreen } from '../screens/MembersScreen';
import { DomainsScreen } from '../screens/DomainsScreen';
import { AdminAssociationsScreen } from '../screens/AdminAssociationsScreen';
import { SendNotificationScreen } from '../screens/SendNotificationScreen';
import { ScheduledNotificationsScreen } from '../screens/ScheduledNotificationsScreen';
import { ContentManagerScreen } from '../screens/ContentManagerScreen';
import { DeletionRequestsScreen } from '../screens/DeletionRequestsScreen';
import { HomeStatsScreen } from '../screens/HomeStatsScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { NotificationInboxScreen } from '../screens/NotificationInboxScreen';
import { NotificationHistoryScreen } from '../screens/NotificationHistoryScreen';
import { DomainAuditLogScreen } from '../screens/DomainAuditLogScreen';
import { NotificationPreferencesScreen } from '../screens/NotificationPreferencesScreen';
import { MemberDirectoryScreen } from '../screens/MemberDirectoryScreen';
import { MemberDocumentsScreen } from '../screens/MemberDocumentsScreen';
import { CguAcceptanceScreen } from '../screens/CguAcceptanceScreen';
import { LegalDocumentScreen } from '../screens/LegalDocumentScreen';
import { MyDataScreen } from '../screens/MyDataScreen';
import { AccountDeletionRequestScreen } from '../screens/AccountDeletionRequestScreen';
import { CustomTabBar } from '../components/CustomTabBar';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EditAssociationScreen } from '../screens/EditAssociationScreen';

import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { navigationRef, flushPendingNavigation } from './navigationRef';

const Tab = createBottomTabNavigator();
const AccountStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

// Écrans légaux/RGPD accessibles depuis n'importe quel espace connecté.
const legalScreens = (
  <>
    <AccountStack.Screen name="LegalDocument" component={LegalDocumentScreen} />
    <AccountStack.Screen name="MyData" component={MyDataScreen} />
    <AccountStack.Screen name="AccountDeletionRequest" component={AccountDeletionRequestScreen} />
  </>
);

const AccountStackNavigator: React.FC = () => {
  const { user, loading, isActiveMember, needsCgu, refresh } = useAuth();

  // Chaque ouverture de l'onglet Compte relit les droits : la page affichée suit le rôle actuel.
  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AccountStack.Navigator screenOptions={{ headerShown: false }}>
      {user && needsCgu ? (
        <AccountStack.Screen name="CguAcceptance" component={CguAcceptanceScreen} />
      ) : user && isActiveMember ? (
        user.role === 'member' ? (
          <>
            <AccountStack.Screen name="MemberHome" component={MemberHomeScreen} />
            <AccountStack.Screen name="MemberDirectory" component={MemberDirectoryScreen} />
            <AccountStack.Screen name="MemberDocuments" component={MemberDocumentsScreen} />
            <AccountStack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
            <AccountStack.Screen name="NotificationInbox" component={NotificationInboxScreen} />
            <AccountStack.Screen name="EditProfile" component={EditProfileScreen} />
            {legalScreens}
          </>
        ) : (
          <>
            <AccountStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <AccountStack.Screen name="EditAssociation" component={EditAssociationScreen} />
            <AccountStack.Screen name="ContentManager" component={ContentManagerScreen} />
            <AccountStack.Screen name="Members" component={MembersScreen} />
            <AccountStack.Screen name="EditProfile" component={EditProfileScreen} />
            <AccountStack.Screen name="NotificationInbox" component={NotificationInboxScreen} />
            <AccountStack.Screen name="MemberDirectory" component={MemberDirectoryScreen} />
            <AccountStack.Screen name="MemberDocuments" component={MemberDocumentsScreen} />
            <AccountStack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
            {legalScreens}
            {user.role === 'admin_national' && (
              <>
                <AccountStack.Screen name="Domains" component={DomainsScreen} />
                <AccountStack.Screen name="AdminAssociations" component={AdminAssociationsScreen} />
                <AccountStack.Screen name="SendNotification" component={SendNotificationScreen} />
                <AccountStack.Screen name="ScheduledNotifications" component={ScheduledNotificationsScreen} />
                <AccountStack.Screen name="DeletionRequests" component={DeletionRequestsScreen} />
                <AccountStack.Screen name="HomeStats" component={HomeStatsScreen} />
                <AccountStack.Screen name="NotificationHistory" component={NotificationHistoryScreen} />
                <AccountStack.Screen name="DomainAuditLog" component={DomainAuditLogScreen} />
              </>
            )}
          </>
        )
      ) : user ? (
        <>
          <AccountStack.Screen name="MembershipRenewal" component={MembershipRenewalScreen} />
          {legalScreens}
        </>
      ) : (
        <>
          <AccountStack.Screen name="Login" component={AccountScreen} />
          <AccountStack.Screen name="DomainNotAllowed" component={DomainNotAllowedScreen} />
          {legalScreens}
        </>
      )}
    </AccountStack.Navigator>
  );
};

// Barre d'onglets. `history` : le retour ramène à l'onglet précédemment visité
// (et non au premier onglet), y compris depuis Actualités / Événements / Actu Admin.
const TabsNavigator: React.FC = () => (
  <Tab.Navigator
    initialRouteName="Accueil"
    backBehavior="history"
    tabBar={(props) => <CustomTabBar {...props} />}
    screenOptions={{
      headerShown: false,
    }}
  >
    <Tab.Screen name="Associations" component={AssociationsDirectoryScreen} />
    <Tab.Screen name="Accueil" component={HomeScreen} />
    <Tab.Screen name="Compte" component={AccountStackNavigator} />
    {/* Actualités : accessible depuis l'accueil, absente de la barre */}
    <Tab.Screen name="Actualités" component={NewsScreen} />
    <Tab.Screen name="EventsFullScreen" component={EventsFullScreen} options={{ tabBarStyle: { display: 'none' } }} />
    <Tab.Screen name="ActuAdmin" component={ActuAdminScreen} options={{ tabBarStyle: { display: 'none' } }} />
  </Tab.Navigator>
);

export const AppNavigator: React.FC = () => {
  return (
    <AuthProvider>
      <NavigationContainer ref={navigationRef} onReady={flushPendingNavigation}>
        {/* Pile racine : les écrans ouverts depuis l'accueil (cloche) se posent par-dessus
            les onglets, et « retour » revient exactement là où l'on était. */}
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Tabs" component={TabsNavigator} />
          <RootStack.Screen name="NotificationInbox" component={NotificationInboxScreen} />
          <RootStack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
        </RootStack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
};
