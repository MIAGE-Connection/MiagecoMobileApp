# MIAGE Connection App 📱

Application mobile officielle de la fédération **MIAGE Connection**, destinée aux étudiants, diplômés et associations du réseau MIAGE en France.

## 🚀 Stack Technique

- **Framework** : React Native avec [Expo](https://expo.dev/)
- **Langage** : TypeScript
- **Navigation** : React Navigation (Bottom Tabs)
- **Design** : Vanilla React Native StyleSheet (Thème personnalisé)
- **Icônes** : @expo/vector-icons (Ionicons)

## 🛠️ Installation et Lancement

### Pré-requis
- Node.js installé
- Expo Go installé sur votre mobile (ou un émulateur iOS/Android)

### Étapes
1. **Installer les dépendances** :
   ```bash
   npm install
   ```

2. **Lancer l'application** :
   ```bash
   npx expo start
   ```

3. **Scanner le QR Code** avec l'application Expo Go sur votre téléphone.

## 📁 Structure du Projet

```text
src/
  components/       # Composants UI réutilisables (AppButton, AppCard, etc.)
  screens/          # Écrans principaux de l'application
  services/         # Logique métier et appels API (mockés en V1)
  data/             # Données de test et constantes
  types/            # Définitions TypeScript
  theme/            # Couleurs, espacements et styles globaux
  navigation/       # Configuration de la navigation
```

## 🔐 Authentification & Données (V1 MVP)

Pour cette première version :
- Les **actualités Instagram** sont mockées via `instagramService.ts`.
- L'**authentification administrateur** est simulée via `authService.ts`.
- Le fichier `supabase_setup.sql` est fourni à la racine pour la future mise en place de la base de données réelle.

### Comment passer en production ?

1. **Backend** : Configurer un projet Supabase ou Firebase.
2. **Auth** : Remplacer `authService.ts` par les appels SDK de Supabase Auth.
3. **Instagram** : Créer un backend (Node.js/Supabase Edge Function) pour récupérer le flux Instagram de manière sécurisée et exposer une API consommée par `instagramService.ts`.

## 🔜 Prochaines Étapes Techniques

- [ ] Intégration réelle avec Supabase
- [ ] Notifications push pour les nouvelles actualités
- [ ] Carte interactive des MIAGE en France
- [ ] Calendrier des événements nationaux (Spring Connection, etc.)
- [ ] Annuaire sécurisé des administrateurs d'associations
- [ ] Offres de stages et alternances partenaires

---
© 2024 MIAGE Connection - Développé avec ❤️ pour le réseau MIAGE.
