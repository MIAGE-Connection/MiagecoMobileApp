import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { adminNotificationService } from '../services/adminNotificationService';

export const SendNotificationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Champs manquants', 'Renseigne un titre et un message.');
      return;
    }
    setSending(true);
    try {
      const sent = await adminNotificationService.sendBroadcast(title.trim(), body.trim());
      Alert.alert('Envoyé', `Notification envoyée à ${sent} adhérent${sent > 1 ? 's' : ''}.`);
      setTitle('');
      setBody('');
    } catch (error: any) {
      console.error('SendNotificationScreen: send error', error);
      Alert.alert('Erreur', error?.message || "Impossible d'envoyer la notification.");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Envoyer une notification</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.infoBoxText}>
              Envoyée à tous les adhérents actifs n'ayant pas désactivé les notifications.
            </Text>
          </View>

          <Text style={styles.label}>Titre</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Nouvelle actu fédération"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Contenu de la notification..."
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={4}
            maxLength={500}
          />

          <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={sending}>
            {sending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="send" size={16} color={colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.sendButtonText}>Envoyer à tous les adhérents</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
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
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  content: {
    padding: spacing.xl,
  },
  infoBox: {
    backgroundColor: colors.primarySoft,
    padding: spacing.lg,
    borderRadius: 20,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(14, 26, 74, 0.7)',
    lineHeight: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
});
