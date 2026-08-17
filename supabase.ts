import { createClient } from '@supabase/supabase-js';

// Configuration from provided project credentials or Vite env vars
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://jqwjvmchliimbhfwhmtk.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxd2p2bWNobGlpbWJoZndobXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NzY2MzksImV4cCI6MjEwMjI1MjYzOX0.6YgoNo7FdB_5YGgEKZzJiOJWPTQImPd2n1Ifwqvy27w';

const createSafeStorage = () => {
  const memoryStore = new Map<string, string>();
  return {
    getItem: (key: string): string | null => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch {
        // Ignore localStorage restriction
      }
      return memoryStore.get(key) || null;
    },
    setItem: (key: string, value: string): void => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
      } catch {
        // Ignore localStorage restriction
      }
      memoryStore.set(key, value);
    },
    removeItem: (key: string): void => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
      } catch {
        // Ignore localStorage restriction
      }
      memoryStore.delete(key);
    },
  };
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: createSafeStorage(),
    detectSessionInUrl: false,
  },
});

export const SUPABASE_CONFIG = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
};
