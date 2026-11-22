import { router } from 'expo-router';
import { Button } from '@/shared/ui/kit';
import { useGarminImport } from './bffAccess.client';

/** Entry point of the Garmin import: nothing at all until a BFF URL and an access token are set. */
export function GarminImportLink() {
  if (!useGarminImport().access) return null;
  return <Button testID="garmin-import-open" icon="cloud-download-outline" title="Importer depuis Garmin" onPress={() => router.push('/garmin')} />;
}
