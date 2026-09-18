import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../contexts/AuthContext';
import { newContentService, NewContentKind } from '../services/newContentService';

const ZERO: Record<NewContentKind, number> = { member_documents: 0, notification_history: 0 };

// Compteurs « non lu » (documents, notifications) pour les adhérents
// et les référents. Le super admin publie ces contenus : pas de compteur pour lui.
export function useNewCounts() {
  const { user, isActiveMember, needsCgu } = useAuth();
  const enabled = Boolean(user) && isActiveMember && !needsCgu && user?.role !== 'admin_national';
  const [counts, setCounts] = useState(ZERO);

  const load = useCallback(async () => {
    if (!enabled) {
      setCounts(ZERO);
      return;
    }
    setCounts(await newContentService.countAll());
  }, [enabled]);

  useEffect(() => {
    load();
    const unsubscribe = newContentService.subscribe(load);
    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'active') load();
    });
    // Notification reçue app ouverte : on laisse 3 s au serveur pour l'enregistrer.
    const push =
      Platform.OS === 'web' ? null : Notifications.addNotificationReceivedListener(() => setTimeout(load, 3000));

    return () => {
      unsubscribe();
      appState.remove();
      push?.remove();
    };
  }, [load]);

  const total = counts.member_documents + counts.notification_history;
  return { counts, total, reload: load };
}
