import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

interface AuthStorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

const SECURE_STORE_CHUNK_SIZE = 1800;

const chunkCountKey = (key: string) => `${key}.__chunks`;
const chunkKey = (key: string, index: number) => `${key}.__chunk_${index}`;

const readChunkCount = async (key: string): Promise<number> => {
  const value = await SecureStore.getItemAsync(chunkCountKey(key));
  const count = value ? Number.parseInt(value, 10) : 0;
  return Number.isFinite(count) && count > 0 ? count : 0;
};

const secureStoreAdapter: AuthStorageAdapter = {
  getItem: async key => {
    const count = await readChunkCount(key);
    if (!count) {
      return null;
    }

    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index))),
    );
    return chunks.every((chunk): chunk is string => chunk !== null) ? chunks.join('') : null;
  },

  setItem: async (key, value) => {
    const oldCount = await readChunkCount(key);
    const chunks = Array.from(
      { length: Math.max(1, Math.ceil(value.length / SECURE_STORE_CHUNK_SIZE)) },
      (_, index) => value.slice(index * SECURE_STORE_CHUNK_SIZE, (index + 1) * SECURE_STORE_CHUNK_SIZE),
    );

    await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk)));
    if (oldCount > chunks.length) {
      await Promise.all(
        Array.from({ length: oldCount - chunks.length }, (_, index) =>
          SecureStore.deleteItemAsync(chunkKey(key, chunks.length + index)),
        ),
      );
    }
    await SecureStore.setItemAsync(chunkCountKey(key), String(chunks.length));
  },

  removeItem: async key => {
    const count = await readChunkCount(key);
    await Promise.all(
      Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(chunkKey(key, index))),
    );
    await SecureStore.deleteItemAsync(chunkCountKey(key));
  },
};

const webStorageAdapter: AuthStorageAdapter = {
  getItem: key => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: key => AsyncStorage.removeItem(key),
};

export const authStorage = Platform.OS === 'web' ? webStorageAdapter : secureStoreAdapter;
