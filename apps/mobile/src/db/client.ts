import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { appConfig } from '@/shared/config/appConfig';
import migrations from './migrations/migrations';
import * as schema from './schema';

// The local database is the source of truth: every screen reads from it and works offline.
// `$client` is the raw expo-sqlite handle, which Drizzle Studio reads in development.
export let db: ExpoSQLiteDatabase<typeof schema> & { $client: SQLiteDatabase };

/**
 * Opens and migrates the database once. Awaited by the root layout before any screen renders.
 */
export const databaseReady = (async () => {
  // `enableChangeListener` is what lets Drizzle's useLiveQuery re-run after writes.
  // Each variant has its own file, so development never touches production data.
  const sqlite = await openDatabaseAsync(appConfig().databaseName, { enableChangeListener: true });
  await sqlite.execAsync('PRAGMA foreign_keys = ON;');
  db = drizzle(sqlite, { schema, casing: 'snake_case' });
  await migrate(db, migrations);
})();
