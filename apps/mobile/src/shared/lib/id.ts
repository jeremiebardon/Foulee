import { randomUUID } from 'expo-crypto';

/** UUIDs, not autoincrement: rows created offline on two devices never collide when synced later. */
export const newId = randomUUID;
