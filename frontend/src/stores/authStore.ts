import { create } from 'zustand';
import { User } from '../types/auth.js';
import { apiRequest } from '../lib/api.js';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, token) => {
    localStorage.setItem('access_token', token);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Ignora erro no logout
    } finally {
      localStorage.removeItem('access_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('access_token');

    // 1. Se tem token no localStorage, valida no /auth/me
    if (token) {
      try {
        const response = await apiRequest<{ success: boolean; data: User }>('/auth/me');
        if (response.success && response.data) {
          set({ user: response.data, isAuthenticated: true, isLoading: false });
          return;
        }
      } catch {
        // Se o token expirou, tenta renovar via refresh token abaixo
      }
    }

    // 2. Tenta renovação automática e silenciosa via refresh_token HttpOnly
    try {
      const refreshRes = await apiRequest<{
        success: boolean;
        data: { user: User; accessToken: string };
      }>('/auth/refresh', { method: 'POST' });

      if (refreshRes.success && refreshRes.data) {
        localStorage.setItem('access_token', refreshRes.data.accessToken);
        set({ user: refreshRes.data.user, isAuthenticated: true, isLoading: false });
        return;
      }
    } catch {
      // Sessão realmente expirada ou inexistente
    }

    // Se tudo falhar, limpa o estado
    localStorage.removeItem('access_token');
    set({ user: null, isAuthenticated: false, isLoading: false });
  }
}));
