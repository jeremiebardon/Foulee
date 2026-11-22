import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl } from 'react-native';
import { Button, Card, Empty, Screen, Txt } from '@/shared/ui/kit';
import { color } from '@/shared/ui/theme';
import { newestFirst } from '../domain/activity';
import { readImportCursor, saveImport } from '../data/activity.repository';
import { ActivityCard } from '../components/ActivityCard';
import { BffError, fetchActivitiesSince, type ImportFailure } from '../data/bff.api';
import type { BffAccess } from '../domain/bffAccess';
import { useGarminImport } from '../data/bffAccess.store';
import { useLinking } from '../hooks/useLinking';

const FAILURE_MESSAGES: Record<ImportFailure, string> = {
  network: 'BFF injoignable. Vérifier la connexion, puis tirer vers le bas pour réessayer.',
  unauthorized: 'Le BFF refuse le jeton d’accès. Le vérifier dans les réglages.',
  garmin_access_expired: 'L’accès Garmin a expiré : créer une nouvelle clé d’API personnelle dans Garmin Connect et la donner au BFF.',
  unexpected: 'L’import a échoué. Réessayer plus tard.',
};

const addedMessage = (count: number) =>
  count === 0 ? 'Aucune nouvelle activité.' : count === 1 ? '1 nouvelle activité.' : `${count} nouvelles activités.`;

type Outcome = { added: number } | { failure: ImportFailure };

const openSettings = () => router.push('/settings');

/** Fetches what is new since the stored cursor and stores it. Never rejects: a failure is an outcome to show. */
async function importNew(access: BffAccess): Promise<Outcome> {
  try {
    const page = await fetchActivitiesSince(access, readImportCursor());
    return { added: saveImport(page) };
  } catch (error) {
    return { failure: error instanceof BffError ? error.reason : 'unexpected' };
  }
}

/**
 * The Garmin import: fetches new Activities from the BFF when it opens and on pull-to-refresh,
 * resuming from the cursor stored on the phone. Only this screen talks to the network: when the
 * BFF is down, it says so and the rest of the app works as before (ADR 0005).
 */
export function ActivityImportScreen() {
  const { access } = useGarminImport();
  const linking = useLinking();
  const list = newestFirst(linking.activities);
  // The screen imports as soon as it opens, so it starts out importing.
  const [importing, setImporting] = useState(true);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const running = useRef(false);

  /** One import at a time; its outcome lands once the BFF has answered. */
  const fetchNew = useCallback(() => {
    if (!access || running.current) return;
    running.current = true;
    void importNew(access).then((next) => {
      running.current = false;
      setOutcome(next);
      setImporting(false);
    });
  }, [access]);

  useEffect(fetchNew, [fetchNew]);

  const refresh = () => {
    if (running.current) return;
    setImporting(true);
    fetchNew();
  };

  if (!access) {
    return (
      <Screen testID="garmin-import">
        <Empty
          testID="garmin-import-unavailable"
          title="Import Garmin non configuré"
          text="Enregistrer le jeton d’accès du BFF dans les réglages pour importer les sorties de la montre."
          action={<Button testID="garmin-open-settings" title="Ouvrir les réglages" variant="primary" onPress={openSettings} />}
        />
      </Screen>
    );
  }

  return (
    <Screen testID="garmin-import" refreshControl={<RefreshControl refreshing={importing} onRefresh={refresh} tintColor={color.accent} />}>
      {outcome && 'failure' in outcome && (
        <Card testID="garmin-import-failure">
          <Txt testID={`garmin-import-failure-${outcome.failure}`} v="error">{FAILURE_MESSAGES[outcome.failure]}</Txt>
          {outcome.failure === 'unauthorized' && <Button testID="garmin-open-settings" title="Ouvrir les réglages" onPress={openSettings} />}
        </Card>
      )}
      {outcome && 'added' in outcome && <Txt testID="garmin-import-added" v="muted">{addedMessage(outcome.added)}</Txt>}
      {list.length === 0 ? (
        <Empty testID="garmin-import-empty" title="Aucune activité" text="Tirer vers le bas pour importer les sorties de la montre." />
      ) : (
        list.map((activity) => <ActivityCard key={activity.garminActivityId} activity={activity} linking={linking} />)
      )}
    </Screen>
  );
}
