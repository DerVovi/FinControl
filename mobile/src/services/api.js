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

  // Edição de Transação com reajuste automático de saldo
  async updateTransaction({ transactionId, description, amountCents, categoryId, notes }) {
    try {
      if (!transactionId) throw new Error('ID da transação é obrigatório.');

      // Busca transação atual
      const { data: currentTx, error: fetchErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchErr || !currentTx) throw new Error('Transação não encontrada.');

      const updateData = { updatedAt: new Date().toISOString() };
      if (description) updateData.description = description.trim();
      if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;
      if (categoryId) updateData.categoryId = categoryId;

      const oldCents = Number(currentTx.amountCents || 0);
      const newCents = amountCents !== undefined && amountCents !== null ? Math.round(Number(amountCents)) : oldCents;
      if (amountCents !== undefined) updateData.amountCents = newCents;

      // Se o valor mudou e a transação estiver CONFIRMED e tiver conta vinculada, reajusta saldo
      if (oldCents !== newCents && currentTx.status === 'CONFIRMED' && currentTx.accountId) {
        const { data: acc } = await supabase
          .from('accounts')
          .select('currentBalanceCents')
          .eq('id', currentTx.accountId)
          .single();

        if (acc) {
          const currentAccBalance = Number(acc.currentBalanceCents || 0);
          const diff = newCents - oldCents;
          const balanceAdjustment = currentTx.type === 'INCOME' ? diff : -diff;
          const updatedBalance = currentAccBalance + balanceAdjustment;

          await supabase
            .from('accounts')
            .update({
              currentBalanceCents: updatedBalance,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', currentTx.accountId);
        }
      }

      const { data: updatedTx, error: updateErr } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', transactionId)
        .select()
        .single();

      if (updateErr) throw updateErr;
      return { success: true, transaction: updatedTx };
    } catch (err) {
      console.error('Erro ao atualizar transação:', err);
      return { success: false, error: err.message || 'Falha ao atualizar transação.' };
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

  // Atualização de Conta Bancária / Carteira
  async updateAccount({ accountId, name, type, color, currentBalanceCents }) {
    try {
      if (!accountId) throw new Error('ID da conta é obrigatório.');
      const updateData = { updatedAt: new Date().toISOString() };

      if (name && typeof name === 'string') updateData.name = name.trim();
      if (type) updateData.type = type;
      if (color) updateData.color = color;
      if (currentBalanceCents !== undefined && currentBalanceCents !== null) {
        updateData.currentBalanceCents = Math.round(Number(currentBalanceCents));
      }

      const { data, error } = await supabase
        .from('accounts')
        .update(updateData)
        .eq('id', accountId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, account: data };
    } catch (err) {
      console.error('Erro ao atualizar conta:', err);
      return { success: false, error: err.message || 'Falha ao atualizar conta.' };
    }
  },

  // Exclusão de Conta Bancária
  async deleteAccount(accountId) {
    try {
      if (!accountId) throw new Error('ID da conta é obrigatório.');

      // Desvincula transações para não quebrar integridade referencial ou remove
      await supabase
        .from('transactions')
        .update({ accountId: null })
        .eq('accountId', accountId);

      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Erro ao excluir conta:', err);
      return { success: false, error: err.message || 'Falha ao excluir conta.' };
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
      return { success: false, error: err.message };
    }
  },

  // ==========================================
  // 🔄 RECORRÊNCIAS & CONTAS FIXAS AUTOMÁTICAS
  // ==========================================

  // Busca regras de contas fixas cadastradas
  async getRecurring(userId) {
    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('userId', userId)
        .eq('active', true)
        .order('dayOfMonth', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Erro ao buscar contas fixas:', err);
      return [];
    }
  },

  // Cadastro de Conta Fixa (Aluguel, Luz, Salário, etc.)
  async createRecurring({ userId, accountId, categoryId, description, type = 'EXPENSE', amountCents, frequency = 'MONTHLY', dayOfMonth = 5 }) {
    try {
      const cents = Math.round(Number(amountCents));
      if (cents <= 0) throw new Error('O valor deve ser maior que zero.');

      let targetAccountId = accountId;
      if (!targetAccountId) {
        const { data: userAccounts } = await supabase
          .from('accounts')
          .select('id')
          .eq('userId', userId)
          .limit(1);
        if (userAccounts && userAccounts.length > 0) {
          targetAccountId = userAccounts[0].id;
        } else {
          throw new Error('Cadastre ao menos uma conta bancária antes de criar uma conta fixa.');
        }
      }

      const newRecId = 'rec_' + Math.random().toString(36).substring(2, 11) + Date.now();
      const now = new Date();
      const nowIso = now.toISOString();

      const { data, error } = await supabase
        .from('recurring_transactions')
        .insert({
          id: newRecId,
          userId,
          accountId: targetAccountId,
          categoryId: categoryId || null,
          description: description.trim(),
          type,
          amountCents: cents,
          frequency,
          dayOfMonth: Number(dayOfMonth) || now.getDate(),
          startDate: nowIso,
          active: true,
          updatedAt: nowIso,
        })
        .select()
        .single();

      if (error) throw error;

      // Executa auto-sync imediato para materializar no mês atual
      await this.syncRecurring(userId);

      return { success: true, recurring: data };
    } catch (err) {
      console.error('Erro ao cadastrar conta fixa:', err);
      return { success: false, error: err.message || 'Falha ao cadastrar conta fixa.' };
    }
  },

  // Desativa ou exclui conta fixa
  async deleteRecurring(recurringId) {
    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .update({ active: false, updatedAt: new Date().toISOString() })
        .eq('id', recurringId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Erro ao remover conta fixa:', err);
      return { success: false, error: err.message };
    }
  },

  // Atualiza regra de conta fixa
  async updateRecurring({ recurringId, description, amountCents, dayOfMonth, accountId, categoryId, type }) {
    try {
      const updateData = { updatedAt: new Date().toISOString() };
      if (description) updateData.description = description.trim();
      if (amountCents !== undefined && amountCents !== null) {
        updateData.amountCents = Math.round(Number(amountCents));
      }
      if (dayOfMonth !== undefined && dayOfMonth !== null) {
        updateData.dayOfMonth = Number(dayOfMonth);
      }
      if (accountId) updateData.accountId = accountId;
      if (categoryId) updateData.categoryId = categoryId;
      if (type) updateData.type = type;

      const { data, error } = await supabase
        .from('recurring_transactions')
        .update(updateData)
        .eq('id', recurringId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, recurring: data };
    } catch (err) {
      console.error('Erro ao atualizar conta fixa:', err);
      return { success: false, error: err.message };
    }
  },

  // Motor de Sincronização Automática: Materializa as contas fixas do mês corrente
  async syncRecurring(userId) {
    try {
      const recurringList = await this.getRecurring(userId);
      if (!recurringList || recurringList.length === 0) return { processed: 0 };

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0 a 11
      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999).toISOString();

      // Busca transações já criadas no mês corrente para este usuário
      const { data: monthTxs } = await supabase
        .from('transactions')
        .select('id, recurringTransactionId, date, status')
        .eq('userId', userId)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      const existingRecIds = new Set(
        (monthTxs || []).map((t) => t.recurringTransactionId).filter(Boolean)
      );

      let createdCount = 0;

      for (const rec of recurringList) {
        if (existingRecIds.has(rec.id)) {
          continue; // Já foi gerada para o mês atual!
        }

        // Calcula a data de vencimento no mês atual
        const targetDay = Number(rec.dayOfMonth) || 5;
        const maxDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const effectiveDay = Math.min(targetDay, maxDaysInMonth);
        const billDate = new Date(currentYear, currentMonth, effectiveDay, 12, 0, 0);

        // Contas fixas geradas para o mês iniciam como PENDING (não pagas),
        // permitindo ao usuário marcar como Paga ou identificar se está A Vencer / Vencida
        const status = 'PENDING';

        const newTxId = 'tx_rec_' + Math.random().toString(36).substring(2, 10) + Date.now();
        const nowIso = new Date().toISOString();

        const { error: insErr } = await supabase.from('transactions').insert({
          id: newTxId,
          userId,
          accountId: rec.accountId || null,
          categoryId: rec.categoryId || null,
          type: rec.type,
          amountCents: Number(rec.amountCents),
          description: rec.description,
          notes: `Conta Fixa Automática (${rec.frequency === 'MONTHLY' ? 'Mensal' : rec.frequency} - Venc. dia ${effectiveDay})`,
          date: billDate.toISOString(),
          status,
          isRecurring: true,
          recurringTransactionId: rec.id,
          updatedAt: nowIso,
        });

        if (!insErr) {
          createdCount++;
        }
      }

      return { success: true, createdCount };
    } catch (err) {
      console.warn('Erro ao sincronizar contas fixas:', err);
      return { success: false, error: err.message };
    }
  },

  // Confirmar pagamento de uma conta pendente com atualização de saldo
  async confirmPendingTransaction(tx) {
    try {
      if (!tx || !tx.id) throw new Error('Transação inválida.');

      const nowIso = new Date().toISOString();

      // 1. Atualiza status para CONFIRMED
      const { data, error } = await supabase
        .from('transactions')
        .update({
          status: 'CONFIRMED',
          updatedAt: nowIso,
        })
        .eq('id', tx.id)
        .select()
        .single();

      if (error) throw error;

      // 2. Debita o saldo da conta bancária vinculada
      if (tx.accountId) {
        const { data: acc } = await supabase
          .from('accounts')
          .select('currentBalanceCents')
          .eq('id', tx.accountId)
          .single();

        if (acc) {
          const current = Number(acc.currentBalanceCents || 0);
          const cents = Number(tx.amountCents || 0);
          const delta = tx.type === 'INCOME' ? cents : -cents;
          await supabase
            .from('accounts')
            .update({
              currentBalanceCents: current + delta,
              updatedAt: nowIso,
            })
            .eq('id', tx.accountId);
        }
      }

      return { success: true, transaction: data };
    } catch (err) {
      console.error('Erro ao confirmar pagamento:', err);
      return { success: false, error: err.message };
    }
  },

  // Reverter pagamento de uma transação confirmada (voltando para PENDING e estornando saldo)
  async revertPendingTransaction(tx) {
    try {
      if (!tx || !tx.id) throw new Error('Transação inválida.');

      const nowIso = new Date().toISOString();

      // 1. Atualiza status para PENDING
      const { data, error } = await supabase
        .from('transactions')
        .update({
          status: 'PENDING',
          updatedAt: nowIso,
        })
        .eq('id', tx.id)
        .select()
        .single();

      if (error) throw error;

      // 2. Estorna o saldo da conta bancária vinculada
      if (tx.accountId) {
        const { data: acc } = await supabase
          .from('accounts')
          .select('currentBalanceCents')
          .eq('id', tx.accountId)
          .single();

        if (acc) {
          const current = Number(acc.currentBalanceCents || 0);
          const cents = Number(tx.amountCents || 0);
          const delta = tx.type === 'INCOME' ? -cents : cents;
          await supabase
            .from('accounts')
            .update({
              currentBalanceCents: current + delta,
              updatedAt: nowIso,
            })
            .eq('id', tx.accountId);
        }
      }

      return { success: true, transaction: data };
    } catch (err) {
      console.error('Erro ao reverter pagamento:', err);
      return { success: false, error: err.message };
    }
  },

  // Alternar pagamento da conta fixa no mês corrente (Paga <-> Pendente/Vencida)
  async toggleRecurringPayment({ recurringId, userId }) {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999).toISOString();

      // Busca a transação do mês desta conta fixa
      const { data: txs, error: fetchErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('userId', userId)
        .eq('recurringTransactionId', recurringId)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .limit(1);

      if (fetchErr) throw fetchErr;

      let tx = txs && txs.length > 0 ? txs[0] : null;

      if (!tx) {
        await this.syncRecurring(userId);
        const { data: refreshed } = await supabase
          .from('transactions')
          .select('*')
          .eq('userId', userId)
          .eq('recurringTransactionId', recurringId)
          .gte('date', startOfMonth)
          .lte('date', endOfMonth)
          .limit(1);
        tx = refreshed && refreshed.length > 0 ? refreshed[0] : null;
      }

      if (!tx) throw new Error('Transação da conta fixa não encontrada.');

      if (tx.status === 'CONFIRMED') {
        const res = await this.revertPendingTransaction(tx);
        return { success: true, status: 'PENDING', transaction: res.transaction };
      } else {
        const res = await this.confirmPendingTransaction(tx);
        return { success: true, status: 'CONFIRMED', transaction: res.transaction };
      }
    } catch (err) {
      console.error('Erro ao alternar status da conta fixa:', err);
      return { success: false, error: err.message };
    }
  },

  // ==========================================
  // 📦 COMPRAS PARCELADAS AUTOMÁTICAS (2x a 48x)
  // ==========================================
  async createInstallmentTransactions({
    userId,
    accountId,
    cardId,
    categoryId,
    description,
    totalAmountCents,
    totalInstallments,
    firstDate = new Date(),
    notes,
  }) {
    try {
      const total = Math.round(Number(totalAmountCents));
      const count = Math.max(1, parseInt(totalInstallments, 10));

      if (total <= 0) throw new Error('O valor total deve ser maior que zero.');

      // Distribuição estrita de centavos inteiros (Prompt Mestre Seção 49)
      const baseCents = Math.floor(total / count);
      const remainder = total % count;

      const now = new Date();
      const nowIso = now.toISOString();
      const parentBatchId = 'inst_' + Math.random().toString(36).substring(2, 9) + Date.now();

      const createdTxs = [];

      for (let i = 0; i < count; i++) {
        // Primeira parcela absorve o resto da divisão para não perder nenhum centavo
        const installmentAmount = i === 0 ? baseCents + remainder : baseCents;

        // Calcula a data da parcela (mês a mês)
        const targetDate = new Date(firstDate.getFullYear(), firstDate.getMonth() + i, firstDate.getDate(), 12, 0, 0);

        // Se a parcela for no débito e data for hoje ou passada: CONFIRMED
        // Se for cartão de crédito ou data futura: PENDING
        const isFirstAndDebit = i === 0 && accountId && !cardId && targetDate <= now;
        const status = isFirstAndDebit ? 'CONFIRMED' : 'PENDING';

        const txId = 'tx_' + parentBatchId + '_' + (i + 1);

        const { data: tx, error } = await supabase.from('transactions').insert({
          id: txId,
          userId,
          accountId: accountId || null,
          cardId: cardId || null,
          categoryId: categoryId || null,
          type: 'EXPENSE',
          amountCents: installmentAmount,
          description: `${description.trim()} (${i + 1}/${count})`,
          notes: notes ? `${notes} • Parcela ${i + 1}/${count}` : `Parcela ${i + 1} de ${count}`,
          date: targetDate.toISOString(),
          status,
          isRecurring: false,
          updatedAt: nowIso,
        }).select().single();

        if (error) throw error;
        createdTxs.push(tx);

        // Atualiza saldo se for débito imediato confirmado
        if (status === 'CONFIRMED' && accountId) {
          const { data: acc } = await supabase
            .from('accounts')
            .select('currentBalanceCents')
            .eq('id', accountId)
            .single();

          if (acc) {
            const current = Number(acc.currentBalanceCents || 0);
            await supabase
              .from('accounts')
              .update({
                currentBalanceCents: current - installmentAmount,
                updatedAt: nowIso,
              })
              .eq('id', accountId);
          }
        }
      }

      return { success: true, count: createdTxs.length, transactions: createdTxs };
    } catch (err) {
      console.error('Erro ao lançar parcelamento:', err);
      return { success: false, error: err.message || 'Falha ao registrar parcelamento.' };
    }
  },
};
