/**
 * ⚡ FinControl Mobile - Native Notification Listener Service
 * Intercepta notificações bancárias e da Carteira do Google diretamente no Android sem apps intermediários.
 * Salva transações em tempo real no Supabase Cloud mesmo em segundo plano (Headless JS).
 */
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { storage } from './storage';
import { parseNotification } from './notificationParser';

const { RNAndroidNotificationListener } = NativeModules;

const STORAGE_KEYS = {
  NOTIFICATION_HASHES: '@fincontrol_notification_hashes',
  NOTIFICATION_HISTORY: '@fincontrol_notification_history',
};

export const notificationListenerService = {
  /**
   * Verifica se a permissão nativa de acesso às notificações está concedida
   * @returns {Promise<'authorized' | 'denied' | 'unknown'>}
   */
  async getPermissionStatus() {
    if (Platform.OS !== 'android') return 'denied';
    if (!RNAndroidNotificationListener || !RNAndroidNotificationListener.getPermissionStatus) {
      console.warn('[NotificationListener] Módulo nativo não carregado neste ambiente.');
      return 'denied';
    }
    try {
      const status = await RNAndroidNotificationListener.getPermissionStatus();
      return status; // 'authorized' | 'denied' | 'unknown'
    } catch (err) {
      console.warn('[NotificationListener] Erro ao checar permissão:', err);
      return 'denied';
    }
  },

  /**
   * Abre a tela nativa do Android de "Acesso a Notificações" para o usuário ativar o FinControl com 1 clique
   */
  requestPermission() {
    if (Platform.OS !== 'android') return;
    if (RNAndroidNotificationListener && RNAndroidNotificationListener.requestPermission) {
      RNAndroidNotificationListener.requestPermission();
    } else {
      console.warn('[NotificationListener] Módulo nativo indisponível para abrir configurações.');
    }
  },

  /**
   * Retorna o histórico das últimas notificações financeiras interceptadas
   */
  async getNotificationHistory() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Limpa o histórico de notificações interceptadas
   */
  async clearNotificationHistory() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
    } catch {}
  },

  /**
   * Processa uma notificação recebida (chamado pelo Headless JS ou em primeiro plano)
   */
  async handleIncomingNotification(rawNotification) {
    try {
      if (!rawNotification) return { success: false, reason: 'empty_payload' };

      const payload = typeof rawNotification === 'string'
        ? JSON.parse(rawNotification)
        : rawNotification;

      // 1. Ignora notificações emitidas pelo próprio FinControl
      const appPackage = String(payload.app || '').toLowerCase();
      if (appPackage.includes('fincontrol')) {
        return { success: false, reason: 'ignored_self_notification' };
      }

      // 2. Analisa a notificação
      const parsed = parseNotification(payload);
      if (!parsed || !parsed.amountCents || parsed.amountCents <= 0) {
        return { success: false, reason: 'not_financial_transaction' };
      }

      // 3. Deduplicação inteligente (janela de 2 minutos para notificações repetidas)
      const minuteWindow = Math.floor(Date.now() / 120000);
      const hash = `${parsed.type}_${parsed.amountCents}_${parsed.description}_${minuteWindow}`;

      const isDuplicate = await this.checkAndSaveHash(hash);
      if (isDuplicate) {
        return { success: false, reason: 'duplicate_notification' };
      }

      // 4. Identifica o usuário ativo
      let user = await storage.getUser();
      const userId = user?.id || '5076ac77-cdd1-486e-9433-fc149406007f';

      // 5. Vincula Cartão de Crédito correspondente aos 4 dígitos finais (se houver)
      let matchedCardId = null;
      if (parsed.lastFourDigits) {
        try {
          const { data: cards } = await supabase
            .from('credit_cards')
            .select('id, lastFourDigits')
            .eq('userId', userId)
            .eq('lastFourDigits', parsed.lastFourDigits)
            .limit(1);

          if (cards && cards.length > 0) {
            matchedCardId = cards[0].id;
          }
        } catch (cardErr) {
          console.warn('[NotificationListener] Erro ao buscar cartão:', cardErr);
        }
      }

      // 6. Vincula Conta Bancária principal se não for cartão
      let matchedAccountId = null;
      if (!matchedCardId) {
        try {
          const { data: accounts } = await supabase
            .from('accounts')
            .select('id, currentBalanceCents')
            .eq('userId', userId)
            .order('createdAt', { ascending: true })
            .limit(1);

          if (accounts && accounts.length > 0) {
            matchedAccountId = accounts[0].id;
          }
        } catch (accErr) {
          console.warn('[NotificationListener] Erro ao buscar conta:', accErr);
        }
      }

      // 7. Vincula Categoria
      let matchedCategoryId = null;
      try {
        const { data: categories } = await supabase
          .from('categories')
          .select('id, name, type')
          .or(`userId.eq.${userId},userId.is.null`);

        if (categories && categories.length > 0) {
          const target = parsed.suggestedCategoryName.toLowerCase();
          const match = categories.find((c) => c.name.toLowerCase() === target)
            || categories.find((c) => c.type === parsed.type);

          if (match) {
            matchedCategoryId = match.id;
          }
        }
      } catch (catErr) {
        console.warn('[NotificationListener] Erro ao buscar categoria:', catErr);
      }

      // 8. Insere a transação diretamente no Supabase Cloud
      const newTxId = 'tx_notif_' + Math.random().toString(36).substring(2, 9) + Date.now();
      const nowIso = new Date().toISOString();

      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .insert({
          id: newTxId,
          userId,
          accountId: matchedAccountId,
          cardId: matchedCardId,
          categoryId: matchedCategoryId,
          type: parsed.type,
          amountCents: parsed.amountCents,
          description: parsed.description,
          notes: `Lançado automaticamente via notificação (${parsed.app})`,
          date: nowIso,
          status: 'CONFIRMED',
          updatedAt: nowIso,
        })
        .select()
        .single();

      if (txError) {
        console.error('[NotificationListener] Erro ao salvar transação no Supabase:', txError);
        return { success: false, error: txError.message };
      }

      // 9. Atualiza saldo da conta bancária vinculada
      if (matchedAccountId) {
        try {
          const { data: acc } = await supabase
            .from('accounts')
            .select('currentBalanceCents')
            .eq('id', matchedAccountId)
            .single();

          if (acc) {
            const current = Number(acc.currentBalanceCents || 0);
            const delta = parsed.type === 'INCOME' ? parsed.amountCents : -parsed.amountCents;
            await supabase
              .from('accounts')
              .update({
                currentBalanceCents: current + delta,
                updatedAt: new Date().toISOString(),
              })
              .eq('id', matchedAccountId);
          }
        } catch (balErr) {
          console.warn('[NotificationListener] Erro ao atualizar saldo:', balErr);
        }
      }

      // 10. Registra no histórico visual de notificações
      await this.saveHistoryEntry({
        id: newTxId,
        title: parsed.description,
        amountCents: parsed.amountCents,
        type: parsed.type,
        app: parsed.app,
        timestamp: nowIso,
        cardLastFour: parsed.lastFourDigits,
      });

      return { success: true, transaction: tx };
    } catch (err) {
      console.error('[NotificationListener] Falha ao processar notificação:', err);
      return { success: false, error: err.message };
    }
  },

  async checkAndSaveHash(hash) {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HASHES);
      let list = raw ? JSON.parse(raw) : [];
      if (list.includes(hash)) {
        return true; // É duplicado
      }
      list.push(hash);
      if (list.length > 50) {
        list = list.slice(-50); // Guarda apenas os 50 mais recentes
      }
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_HASHES, JSON.stringify(list));
      return false;
    } catch {
      return false;
    }
  },

  async saveHistoryEntry(entry) {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
      let list = raw ? JSON.parse(raw) : [];
      list.unshift(entry);
      if (list.length > 20) {
        list = list.slice(0, 20); // Mantém os últimos 20
      }
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_HISTORY, JSON.stringify(list));
    } catch {}
  },
};
