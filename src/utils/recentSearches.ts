import AsyncStorage from '@react-native-async-storage/async-storage';

const key = 'africlay:recent-searches:v1';
const maxItems = 8;

const clean = (items: unknown): string[] => Array.isArray(items)
  ? items.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).slice(0, maxItems)
  : [];

export const recentSearches = {
  load: async (): Promise<string[]> => {
    try {
      const stored = await AsyncStorage.getItem(key);
      return stored ? clean(JSON.parse(stored)) : [];
    } catch {
      return [];
    }
  },
  add: async (query: string): Promise<string[]> => {
    const normalized = query.trim();
    if (!normalized) return recentSearches.load();
    const current = await recentSearches.load();
    const next = [normalized, ...current.filter(item => item.toLocaleLowerCase() !== normalized.toLocaleLowerCase())].slice(0, maxItems);
    try { await AsyncStorage.setItem(key, JSON.stringify(next)); } catch { return next; }
    return next;
  },
  remove: async (query: string): Promise<string[]> => {
    const current = await recentSearches.load();
    const next = current.filter(item => item !== query);
    try { await AsyncStorage.setItem(key, JSON.stringify(next)); } catch { return next; }
    return next;
  },
  clear: async (): Promise<void> => { try { await AsyncStorage.removeItem(key); } catch { return; } },
};
