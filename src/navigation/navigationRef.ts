import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

let pendingAccountNavigation = false;

// Après une connexion réussie via le lien de retour Google, on ouvre l'onglet
// Compte (l'app peut avoir redémarré à froid sur l'onglet Accueil).
export const goToAccountTab = () => {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Tabs', { screen: 'Compte' });
  } else {
    pendingAccountNavigation = true;
  }
};

export const flushPendingNavigation = () => {
  if (pendingAccountNavigation && navigationRef.isReady()) {
    pendingAccountNavigation = false;
    navigationRef.navigate('Tabs', { screen: 'Compte' });
  }
};
