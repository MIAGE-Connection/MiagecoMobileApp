import { Alert, Linking } from 'react-native';

export const openUrl = async (url?: string | null) => {
  if (!url) return;
  const target = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
  try {
    await Linking.openURL(target);
  } catch {
    Alert.alert('Lien impossible à ouvrir', target);
  }
};

export const openMail = (email?: string | null) => openUrl(email ? `mailto:${email}` : null);

export const openInstagram = (username?: string | null) =>
  openUrl(username ? `https://instagram.com/${username.replace(/^@/, '')}` : null);

const toGoogleDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// Ajoute un événement au calendrier via le lien Google Agenda : fonctionne sur
// tout téléphone, sans module natif ni autorisation supplémentaire.
export const addToCalendar = (event: {
  title: string;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  description?: string | null;
}) => {
  if (!event.start_date) {
    Alert.alert('Date à confirmer', "Cet événement n'a pas encore de date précise.");
    return;
  }
  const start = new Date(event.start_date);
  const end = event.end_date ? new Date(event.end_date) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const params = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(event.title)}`,
    `dates=${toGoogleDate(start)}/${toGoogleDate(end)}`,
    `details=${encodeURIComponent(event.description || '')}`,
    `location=${encodeURIComponent(event.location || '')}`,
  ].join('&');
  return openUrl(`https://calendar.google.com/calendar/render?${params}`);
};

export const formatLongDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

export const formatTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
