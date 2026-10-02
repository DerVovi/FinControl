/**
 * 💾 FinControl Mobile - Local Storage & Cache Manager
 * Garante inicialização em 0.1s com offline cache e fallback em memória anti-crash.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER: '@fincontrol_user',
  TOKEN: '@fincontrol_token',
  ACCOUNTS_CACHE: '@fincontrol_accounts_cache',
  TRANSACTIONS_CACHE: '@fincontrol_transactions_cache',
  CARDS_CACHE: '@fincontrol_cards_cache',
};

const memoryStore = {};

export const storage = {
  // Sessão de Usuário
  async saveUser(user, token) {
    try {
      const userStr = JSON.stringify(user);
      memoryStore[KEYS.USER] = userStr;
      if (token) memoryStore[KEYS.TOKEN] = token;

      await AsyncStorage.setItem(KEYS.USER, userStr);
      if (token) {
        await AsyncStorage.setItem(KEYS.TOKEN, token);
      }
    } catch (e) {
      console.warn('Aviso storage.saveUser:', e);
    }
  },

  async getUser() {
    try {
      const data = await AsyncStorage.getItem(KEYS.USER);
      if (data) return JSON.parse(data);
      if (memoryStore[KEYS.USER]) return JSON.parse(memoryStore[KEYS.USER]);
      return null;
    } catch {
      return memoryStore[KEYS.USER] ? JSON.parse(memoryStore[KEYS.USER]) : null;
    }
  },

  async getToken() {
    try {
      return (await AsyncStorage.getItem(KEYS.TOKEN)) || memoryStore[KEYS.TOKEN] || null;
    } catch {
      return memoryStore[KEYS.TOKEN] || null;
    }
  },

  async clearSession() {
    try {
      delete memoryStore[KEYS.USER];
      delete memoryStore[KEYS.TOKEN];
      await AsyncStorage.multiRemove([KEYS.USER, KEYS.TOKEN]);
    } catch (e) {
      console.warn('Aviso storage.clearSession:', e);
    }
  },

  // Cache de Dados para Abertura Instantânea (0.1s)
  async saveCache(key, data) {
    try {
      const str = JSON.stringify(data);
      memoryStore[key] = str;
      await AsyncStorage.setItem(key, str);
    } catch (e) {
      console.warn('Aviso storage.saveCache:', e);
    }
  },

  async getCache(key) {
    try {
      const data = await AsyncStorage.getItem(key);
      if (data) return JSON.parse(data);
      if (memoryStore[key]) return JSON.parse(memoryStore[key]);
      return null;
    } catch {
      return memoryStore[key] ? JSON.parse(memoryStore[key]) : null;
    }
  },

  KEYS,
};
