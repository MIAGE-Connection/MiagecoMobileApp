import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { HubMiagistesScreen } from '../screens/HubMiagistesScreen';
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
import { NotificationPreferencesScreen } from '../screens/NotificationPreferencesScreen';
import { MemberDirectoryScreen } from '../screens/MemberDirectoryScreen';
import { MemberDocumentsScreen } from '../screens/MemberDocumentsScreen';
import { FederalCalendarScreen } from '../screens/FederalCalendarScreen';
import { AnnouncementsScreen } from '../screens/AnnouncementsScreen';
import { CustomTabBar } from '../components/CustomTabBar';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EditAssociationScreen } from '../screens/EditAssociationScreen';

import { AuthProvider, useAuth } from '../contexts/AuthContext';

const Tab = createBottomTabNavigator();
const AccountStack = createNativeStackNavigator();
const HubStack = createNativeStackNavigator();

const AccountStackNavigator: React.FC = () => {
  const { user, loading, isActiveMember } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AccountStack.Navigator screenOptions={{ headerShown: false }}>
      {user && isActiveMember ? (
        user.role === 'member' ? (
          <>
            <AccountStack.Screen name="MemberHome" component={MemberHomeScreen} />
            <AccountStack.Screen name="MemberDirectory" component={MemberDirectoryScreen} />
            <AccountStack.Screen name="MemberDocuments" component={MemberDocumentsScreen} />
            <AccountStack.Screen name="FederalCalendar" component={FederalCalendarScreen} />
            <AccountStack.Screen name="Announcements" component={AnnouncementsScreen} />
            <AccountStack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
          </>
        ) : (
          <>
            <AccountStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <AccountStack.Screen name="EditAssociation" component={EditAssociationScreen} />
            <AccountStack.Screen name="Members" component={MembersScreen} />
            <AccountStack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
            {user.role === 'admin_national' && (
              <>
                <AccountStack.Screen name="Domains" component={DomainsScreen} />
                <AccountStack.Screen name="AdminAssociations" component={AdminAssociationsScreen} />
                <AccountStack.Screen name="SendNotification" component={SendNotificationScreen} />
              </>
            )}
          </>
        )
      ) : user ? (
        <AccountStack.Screen name="MembershipRenewal" component={MembershipRenewalScreen} />
      ) : (
        <>
          <AccountStack.Screen name="Login" component={AccountScreen} />
          <AccountStack.Screen name="DomainNotAllowed" component={DomainNotAllowedScreen} />
        </>
      )}
    </AccountStack.Navigator>
  );
};

const HubStackNavigator: React.FC = () => {
  return (
    <HubStack.Navigator screenOptions={{ headerShown: false }}>
      <HubStack.Screen name="HubMiagistes" component={HubMiagistesScreen} />
      <HubStack.Screen name="AssociationsDirectory" component={AssociationsDirectoryScreen} />
    </HubStack.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Tab.Navigator
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tab.Screen name="Accueil" component={HomeScreen} />
          <Tab.Screen name="Hub MIAGistes" component={HubStackNavigator} />
          <Tab.Screen name="Actualités" component={NewsScreen} />
          <Tab.Screen name="Compte" component={AccountStackNavigator} />
          <Tab.Screen
            name="EventsFullScreen"
            component={EventsFullScreen}
            options={{ tabBarStyle: { display: 'none' } }}
          />
          <Tab.Screen
            name="ActuAdmin"
            component={ActuAdminScreen}
            options={{ tabBarStyle: { display: 'none' } }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
};
