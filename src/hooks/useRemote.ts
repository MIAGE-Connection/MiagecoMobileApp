import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

// Chargement d'une ressource distante avec erreur explicite, rechargement à
// chaque retour sur l'écran et « tirer pour rafraîchir ».
export function useRemote<T>(fetcher: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await fetcher());
      setError(false);
    } catch (e) {
      console.error('useRemote: load error', e);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const retry = useCallback(() => {
    setLoading(true);
    load();
  }, [load]);

  return { data, setData, loading, refreshing, error, refresh, retry, reload: load };
}
