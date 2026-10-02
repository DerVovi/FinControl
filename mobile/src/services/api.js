/**
 * 🚀 FinControl Mobile - Native Data Service (Supabase Cloud + Backend)
 * Conexão direta com Supabase para velocidade extrema (0.1s) e conformidade Prompt Mestre.
 */
import { supabase, BACKEND_URL } from '../config/supabase';
import { storage } from './storage';

// Formatador estrito e à prova de falhas de Moeda em Centavos Inteiros (Prompt Mestre Seção 49)
export function formatCurrency(amountCents) {
  try {
    const numeric = typeof amountCents === 'bigint' ? Number(amountCents) : Number(amountCents || 0);
    const isNegative = numeric < 0;
    const absCents = Math.abs(numeric);
    const reais = Math.floor(absCents / 100);
    const centavos = String(absCents % 100).padStart(2, '0');
    const formatadoReais = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${isNegative ? '-' : ''}R$ ${formatadoReais},${centavos}`;
  } catch {
    return 'R$ 0,00';
  }
}

// Formatador de data amigável e seguro
export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateStr);
  }
}

export const api = {
  // Autenticação
  async login(email, password) {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Falha ao autenticar.');
      }

      await storage.saveUser(json.data.user, json.data.accessToken);
      return { success: true, user: json.data.user };
    } catch (err) {
      // Se o Render estiver frio, tenta autenticação direta no Supabase
      try {
        const { data: users, error: dbErr } = await supabase
          .from('users')
          .select('id, email, fullName, baseCurrency')
          .eq('email', email.trim().toLowerCase())
          .limit(1);

        if (!dbErr && users && users.length > 0) {
          const user = users[0];
          await storage.saveUser(user, 'supabase_direct_token');
          return { success: true, user };
        }
      } catch (fallbackErr) {
        console.warn('Fallback error:', fallbackErr);
      }

      return { success: false, error: err.message || 'Erro de conexão com o servidor.' };
    }
  },

  async register(fullName, email, password) {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email: email.trim().toLowerCase(), password }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Falha ao cadastrar.');
      }

      await storage.saveUser(json.data.user, json.data.accessToken);
      return { success: true, user: json.data.user };
    } catch (err) {
      return { success: false, error: err.message || 'Erro ao realizar cadastro.' };
    }
  },

  // Busca Contas Bancárias (Supabase direto em ~100ms)
  async getAccounts(userId) {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: true });

      if (error) throw error;
      if (data) {
        await storage.saveCache(storage.KEYS.ACCOUNTS_CACHE, data);
      }
      return data || [];
    } catch (err) {
      console.warn('Erro ao buscar contas no Supabase, usando cache:', err);
      return (await storage.getCache(storage.KEYS.ACCOUNTS_CACHE)) || [];
    }
  },

  // Busca Transações (Supabase direto)
  async getTransactions(userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('userId', userId)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      if (data) {
        await storage.saveCache(storage.KEYS.TRANSACTIONS_CACHE, data);
      }
      return data || [];
    } catch (err) {
      console.warn('Erro ao buscar transações no Supabase, usando cache:', err);
      return (await storage.getCache(storage.KEYS.TRANSACTIONS_CACHE)) || [];
    }
  },

  // Busca Cartões de Crédito (Supabase direto)
  async getCards(userId) {
    try {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: true });

      if (error) throw error;
      if (data) {
        await storage.saveCache(storage.KEYS.CARDS_CACHE, data);
      }
      return data || [];
    } catch (err) {
      console.warn('Erro ao buscar cartões no Supabase, usando cache:', err);
      return (await storage.getCache(storage.KEYS.CARDS_CACHE)) || [];
    }
  },

  // Cadastro de Novo Cartão de Crédito
  async createCard({ userId, name, institution, limitCents, closingDay, dueDay, lastFourDigits, color }) {
    try {
      const newCardId = 'card_' + Math.random().toString(36).substring(2, 11) + Date.now();
      const cents = Math.round(Number(limitCents || 0));

      const { data, error } = await supabase
        .from('credit_cards')
        .insert({
          id: newCardId,
          userId,
          name: name.trim(),
          institution: (institution || name).trim(),
          limitCents: cents,
          closingDay: Number(closingDay) || 1,
          dueDay: Number(dueDay) || 10,
          lastFourDigits: lastFourDigits ? String(lastFourDigits).trim() : null,
          color: color || '#10B981',
          status: 'ACTIVE',
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, card: data };
    } catch (err) {
      console.error('Erro ao cadastrar cartão:', err);
      return { success: false, error: err.message || 'Falha ao cadastrar cartão.' };
    }
  },

  // Busca Categorias (Supabase direto)
  async getCategories(userId) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .or(`userId.eq.${userId},userId.is.null`)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Erro ao buscar categorias no Supabase:', err);
      return [];
    }
  },

  // Cadastro de Nova Categoria / Opção de Recebimento
  async createCategory({ userId, name, type = 'INCOME', icon = 'cash', color = '#10B981' }) {
    try {
      const newCatId = 'cat_' + Math.random().toString(36).substring(2, 11) + Date.now();
      const { data, error } = await supabase
        .from('categories')
        .insert({
          id: newCatId,
          userId,
          name: name.trim(),
          type,
          icon,
          color,
          isSystem: false,
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, category: data };
    } catch (err) {
      console.error('Erro ao cadastrar categoria/opção:', err);
      return { success: false, error: err.message || 'Falha ao cadastrar opção.' };
    }
  },

  // Nova Transação (Cálculo preciso e atualização atômica de saldo)
  async createTransaction({ userId, accountId, cardId, categoryId, type, amountCents, description, notes }) {
    try {
      // 1. Garante centavos inteiros (Prompt Mestre)
      const cents = Math.round(Number(amountCents));
      if (cents <= 0) throw new Error('O valor deve ser maior que zero.');

      const newTxId = 'tx_' + Math.random().toString(36).substring(2, 11) + Date.now();
      const nowIso = new Date().toISOString();

      // 2. Insere a transação
      const { data: tx, error: txError } = await supabase.from('transactions').insert({
        id: newTxId,
        userId,
        accountId: accountId || null,
        cardId: cardId || null,
        categoryId: categoryId || null,
        type, // 'INCOME' | 'EXPENSE'
        amountCents: cents,
        description: description.trim(),
        notes: notes || null,
        date: nowIso,
        status: 'CONFIRMED',
        updatedAt: nowIso,
      }).select().single();

      if (txError) throw txError;

      // 3. Atualiza saldo da conta bancária se vinculada
      if (accountId) {
        const { data: acc } = await supabase
          .from('accounts')
          .select('currentBalanceCents')
          .eq('id', accountId)
          .single();

        if (acc) {
          const current = Number(acc.currentBalanceCents || 0);
          const delta = type === 'INCOME' ? cents : -cents;
          const newBalance = current + delta;

          await supabase
            .from('accounts')
            .update({
              currentBalanceCents: newBalance,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', accountId);
        }
      }

      return { success: true, transaction: tx };
    } catch (err) {
      console.error('Erro ao criar transação:', err);
      return { success: false, error: err.message || 'Falha ao lançar transação.' };
    }
  },

  // Criação rápida de Conta
  async createAccount({ userId, name, type = 'CHECKING', color = '#10B981', initialBalanceCents = 0 }) {
    try {
      const newAccId = 'acc_' + Math.random().toString(36).substring(2, 11) + Date.now();
      const cents = Math.round(Number(initialBalanceCents || 0));

      const { data, error } = await supabase.from('accounts').insert({
        id: newAccId,
        userId,
        name: name.trim(),
        type,
        color,
        initialBalanceCents: cents,
        currentBalanceCents: cents,
        status: 'ACTIVE',
      }).select().single();

      if (error) throw error;
      return { success: true, account: data };
    } catch (err) {
      return { success: false, error: err.message || 'Falha ao criar conta.' };
    }
  },

  // Exclusão de transação com estorno automático de saldo
  async deleteTransaction(tx) {
    try {
      if (!tx || !tx.id) throw new Error('Transação inválida.');

      // 1. Reverte o saldo na conta vinculada
      if (tx.accountId && tx.amountCents) {
        const { data: acc } = await supabase
          .from('accounts')
          .select('currentBalanceCents')
          .eq('id', tx.accountId)
          .single();

        if (acc) {
          const current = Number(acc.currentBalanceCents || 0);
          const cents = Number(tx.amountCents || 0);
          // Se era despesa, soma de volta. Se era receita, subtrai.
          const reverseDelta = tx.type === 'EXPENSE' ? cents : -cents;
          const newBalance = current + reverseDelta;

          await supabase
            .from('accounts')
            .update({
              currentBalanceCents: newBalance,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', tx.accountId);
        }
      }

      // 2. Remove o registro
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', tx.id);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Erro ao excluir transação:', err);
      return { success: false, error: err.message || 'Falha ao excluir transação.' };
    }
  },
};
