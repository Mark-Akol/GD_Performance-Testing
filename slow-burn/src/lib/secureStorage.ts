import * as SecureStore from 'expo-secure-store';

/**
 * A Supabase-compatible storage adapter backed by the device keychain
 * (iOS Keychain / Android Keystore) instead of AsyncStorage.
 *
 * Supabase's own Expo guide reaches for AsyncStorage, which writes the session
 * JWT to disk in the clear. For an app holding bodyweight and dietary data,
 * that is the wrong default — a device backup or a rooted handset hands over a
 * live session. SecureStore refuses values much over 2 KB, and Supabase
 * sessions exceed that once a refresh token is attached, so values are split
 * across numbered chunks with a small header recording the count.
 */

const CHUNK_SIZE = 1800;

function chunkKey(key: string, index: number): string {
  return `${key}__c${index}`;
}

function headerKey(key: string): string {
  return `${key}__n`;
}

async function clearFrom(key: string, startIndex: number, knownCount: number): Promise<void> {
  // Delete one past the last known chunk as well, so a shrinking session can
  // never leave a stale tail that a later read would splice back in.
  for (let i = startIndex; i <= knownCount; i += 1) {
    await SecureStore.deleteItemAsync(chunkKey(key, i));
  }
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const header = await SecureStore.getItemAsync(headerKey(key));
      if (!header) return null;

      const count = Number.parseInt(header, 10);
      if (!Number.isInteger(count) || count < 1) return null;

      const parts: string[] = [];
      for (let i = 0; i < count; i += 1) {
        const part = await SecureStore.getItemAsync(chunkKey(key, i));
        // A missing chunk means a partially written or partially wiped
        // session. Treat it as "no session" rather than returning corrupt
        // JSON that would throw deeper inside the Supabase client.
        if (part == null) return null;
        parts.push(part);
      }
      return parts.join('');
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    const previous = await SecureStore.getItemAsync(headerKey(key));
    const previousCount = previous ? Number.parseInt(previous, 10) || 0 : 0;

    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }

    for (let i = 0; i < chunks.length; i += 1) {
      await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]!);
    }
    await SecureStore.setItemAsync(headerKey(key), String(chunks.length));

    if (previousCount > chunks.length) {
      await clearFrom(key, chunks.length, previousCount);
    }
  },

  async removeItem(key: string): Promise<void> {
    const header = await SecureStore.getItemAsync(headerKey(key));
    const count = header ? Number.parseInt(header, 10) || 0 : 0;
    await SecureStore.deleteItemAsync(headerKey(key));
    await clearFrom(key, 0, count);
  },
};
