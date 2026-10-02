/**
 * ⚡ FinControl Mobile - Supabase Native Client
 * Conexão direta com a nuvem Supabase 24/7 sem delay de cold start.
 * Padrão GymFlow com fallback seguro em memória para evitar crashes na inicialização.
 */
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPABASE_URL = 'https://qrkzkhryotlrfmmednju.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFya3praHJ5b3RscmZtbWVkbmp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MzkzODEsImV4cCI6MjEwNjMxNTM4MX0.Yp52bDJscgMd0qNzRualYIHJexn2fL9JKm9a0SxBSkA';

export const BACKEND_URL = 'https://fincontrolw.onrender.com/api/v1';

const memoryStore = {};

const safeStorage = {
  getItem: async (key) => {
    try {
      const val = await AsyncStorage.getItem(key);
      return val ?? memoryStore[key] ?? null;
    } catch {
      return memoryStore[key] ?? null;
    }
  },
  setItem: async (key, value) => {
    try {
      memoryStore[key] = value;
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key) => {
    try {
      delete memoryStore[key];
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
