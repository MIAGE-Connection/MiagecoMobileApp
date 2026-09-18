import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const visibleTabs = ['Accueil', 'Hub MIAGistes', 'Actualités', 'Compte'];

  const iconMap: { [key: string]: any } = {
    Accueil: 'home',
    'Hub MIAGistes': 'people',
    Actualités: 'newspaper',
    Compte: 'person',
  };

  const colorMap: { [key: string]: string } = {
    Accueil: colors.primary,
    'Hub MIAGistes': colors.success,
    Actualités: colors.iconBlue,
    Compte: colors.text,
  };

  const visibleRoutes = state.routes.filter(route => visibleTabs.includes(route.name));

  return (
    <View style={styles.tabBar}>
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
            <Ionicons
              name={isFocused ? iconName : (iconName + '-outline') as any}
              size={24}
              color={color}
            />
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
    height: 70,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 8,
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
  label: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
});
