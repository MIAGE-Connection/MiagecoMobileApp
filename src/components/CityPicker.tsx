import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { FRENCH_CITIES, normalizeText } from '../data/frenchCities';

interface Props {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
}

// Champ « ville » : on choisit dans une liste prédéfinie, avec une recherche
// (sans accents, sans majuscules) pour la retrouver vite.
export const CityPicker: React.FC<Props> = ({ value, onChange, placeholder = 'Choisir une ville' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const cities = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return FRENCH_CITIES;
    return FRENCH_CITIES.filter((city) => normalizeText(city).includes(q));
  }, [query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const select = (city: string) => {
    onChange(city);
    close();
  };

  return (
    <>
      <TouchableOpacity style={styles.field} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Ionicons name="location-outline" size={18} color={colors.textLight} style={{ marginRight: 8 }} />
        <Text style={[styles.fieldText, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        {value ? (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-down" size={16} color={colors.textLight} />
        )}
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Choisir une ville</Text>
            <TouchableOpacity onPress={close} style={styles.closeButton} accessibilityLabel="Fermer">
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={colors.textLight} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une ville..."
              placeholderTextColor={colors.textLight}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoFocus
            />
          </View>
          <FlatList
            data={cities}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>Aucune ville trouvée.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => select(item)}>
                <Text style={[styles.rowText, item === value && styles.rowTextActive]}>{item}</Text>
                {item === value ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  fieldText: { flex: 1, fontSize: 14, color: colors.text },
  placeholder: { color: colors.textLight },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  closeButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-end' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, height: 46, fontSize: 14, color: colors.text },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: { fontSize: 15, color: colors.text },
  rowTextActive: { fontWeight: '800', color: colors.primary },
  empty: { textAlign: 'center', color: colors.textLight, marginTop: spacing.xl },
});
