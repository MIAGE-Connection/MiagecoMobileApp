import { Alert, Platform } from 'react-native';

// Sur le web, Alert.alert de React Native ne fait rien : ni les confirmations
// ni les messages d'erreur ne s'affichaient. On le remplace par les boîtes de
// dialogue du navigateur. Sur téléphone, rien ne change.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  (Alert as any).alert = (title: string, message?: string, buttons?: any[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');

    if (!buttons || buttons.length <= 1) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }

    const cancel = buttons.find((b) => b.style === 'cancel');
    const actions = buttons.filter((b) => b !== cancel);
    if (window.confirm(text)) {
      actions[0]?.onPress?.();
    } else {
      cancel?.onPress?.();
    }
  };
}
