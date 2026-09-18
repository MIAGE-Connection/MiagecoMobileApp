import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNewCounts } from '../hooks/useNewCounts';

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const { total, reload } = useNewCounts();
  // Mode bord à bord : la barre doit s'élever au-dessus des boutons/du geste système.
  const insets = useSafeAreaInsets();

  // Rafraîchit les compteurs à chaque changement d'onglet.
  React.useEffect(() => {
    reload();
  }, [state.index, reload]);

  // Ordre de la barre : Associations, Accueil, Compte (Actualités se lance depuis l'accueil).
  const visibleTabs = ['Associations', 'Accueil', 'Compte'];

  const iconMap: { [key: string]: any } = {
    Accueil: 'home',
    Associations: 'people',
    Compte: 'person',
  };

  const colorMap: { [key: string]: string } = {
    Accueil: colors.primary,
    Associations: colors.primary,
    Compte: colors.primary,
  };

  const visibleRoutes = state.routes.filter(route => visibleTabs.includes(route.name));

  return (
    <View style={[styles.tabBar, { height: 62 + Math.max(insets.bottom, 8), paddingBottom: Math.max(insets.bottom, 8) }]}>
      {visibleRoutes.map((route) => {
        const index = state.routes.findIndex(r => r.key === route.key);
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const iconName = iconMap[route.name] || 'home';
        const color = isFocused ? colorMap[route.name] : colors.textLight;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <View>
              <Ionicons
                name={isFocused ? iconName : (iconName + '-outline') as any}
                size={24}
                color={color}
              />
              {route.name === 'Compte' && total > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{total > 9 ? '9+' : total}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color: isFocused ? color : colors.textLight }]}>
              {route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.tagRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  label: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
});
