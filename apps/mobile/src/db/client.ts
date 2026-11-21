import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseAsync } from 'expo-sqlite';
import migrations from './migrations/migrations';
import * as schema from './schema';

// The local database is the source of truth: every screen reads from it and works offline.
export let db: ExpoSQLiteDatabase<typeof schema>;

/**
 * Opens and migrates the database once. Awaited by the root layout before any screen renders.
 */
export const databaseReady = (async () => {
  // `enableChangeListener` is what lets Drizzle's useLiveQuery re-run after writes.
  const sqlite = await openDatabaseAsync('foulee.db', { enableChangeListener: true });
  await sqlite.execAsync('PRAGMA foreign_keys = ON;');
  db = drizzle(sqlite, { schema, casing: 'snake_case' });
  await migrate(db, migrations);
})();
