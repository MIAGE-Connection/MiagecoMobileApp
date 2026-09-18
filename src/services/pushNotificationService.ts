import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Par défaut, Expo n'affiche pas de bannière système quand l'app est au
// premier plan (elle laisse le code de l'app décider). On veut quand même
// voir les notifs pendant qu'on est dans l'app.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationPreferences {
  user_id: string;
  events_reminders: boolean;
  announcements: boolean;
  federation_news: boolean;
}

const DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'user_id'> = {
  events_reminders: true,
  announcements: true,
  federation_news: true,
};

export const pushNotificationService = {
  // Demande la permission, récupère le token Expo Push et l'enregistre.
  // Ne fait rien sur simulateur/web (pas de vrai token possible).
  async registerForPushNotifications(userId: string): Promise<void> {
    if (!Device.isDevice) {
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = tokenResponse.data;

    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        expo_push_token: expoPushToken,
        device_info: `${Device.modelName || 'unknown'} / ${Platform.OS}`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'expo_push_token' }
    );

    if (error) {
      console.error('pushNotificationService: failed to save token', error);
    }
  },

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data || { user_id: userId, ...DEFAULT_PREFERENCES };
  },

  async updatePreferences(
    userId: string,
    updates: Partial<Omit<NotificationPreferences, 'user_id'>>
  ): Promise<void> {
    const current = await this.getPreferences(userId);
    const { error } = await supabase.from('notification_preferences').upsert(
      {
        ...current,
        ...updates,
        user_id: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) throw error;
  },
};
