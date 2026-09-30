import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { prisma } from '../../infrastructure/database/prisma.js';

describe('Fase 6 — Hardening, Segurança Anti-IDOR & Concorrência', () => {
  let app: FastifyInstance;

  let userAToken: string;
  let userAId: string;
  let userAAccountId: string;
  let userATransactionId: string;
  let userACardId: string;
  let userAGoalId: string;
  let userACategoryId: string;

  let userBToken: string;
  let userBId: string;
  let userBAccountId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Limpa dados de testes de segurança anteriores
    await prisma.user.deleteMany({ where: { email: { contains: 'sec-test' } } });

    // 1. Cria Usuário A (Alice)
    const resA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        fullName: 'Alice Segura',
        email: 'alice@sec-test.com',
        password: 'Password@123'
      }
    });
    const dataA = JSON.parse(resA.body).data;
    userAToken = dataA.accessToken;
    userAId = dataA.user.id;

    // Busca conta da Alice
    const accsARes = await app.inject({
      method: 'GET',
      url: '/api/v1/accounts',
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    userAAccountId = JSON.parse(accsARes.body).data[0].id;

    // Alice cria uma categoria personalizada
    const catARes = await app.inject({
      method: 'POST',
      url: '/api/v1/categories',
      headers: { Authorization: `Bearer ${userAToken}` },
      payload: {
        name: 'Categoria Secreta da Alice',
        type: 'EXPENSE',
        color: '#FF0055'
      }
    });
    userACategoryId = JSON.parse(catARes.body).data.id;

    // Alice cria uma transação
    const txARes = await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      headers: { Authorization: `Bearer ${userAToken}` },
      payload: {
        accountId: userAAccountId,
        categoryId: userACategoryId,
        type: 'INCOME',
        amountCents: '100000', // R$ 1.000,00
        description: 'Receita da Alice',
        date: new Date().toISOString()
      }
    });
    userATransactionId = JSON.parse(txARes.body).data.id;

    // Alice cria um cartão de crédito
    const cardARes = await app.inject({
      method: 'POST',
      url: '/api/v1/cards',
      headers: { Authorization: `Bearer ${userAToken}` },
      payload: {
        name: 'Cartão da Alice',
        institution: 'Banco Teste',
        limitCents: '300000',
        closingDay: 10,
        dueDay: 17
      }
    });
    userACardId = JSON.parse(cardARes.body).data.id;

    // Alice cria uma meta financeira
    const goalARes = await app.inject({
      method: 'POST',
      url: '/api/v1/goals',
      headers: { Authorization: `Bearer ${userAToken}` },
      payload: {
        name: 'Meta Pessoal Alice',
        targetAmountCents: '500000'
      }
    });
    userAGoalId = JSON.parse(goalARes.body).data.id;

    // 2. Cria Usuário B (Bob - O Atacante IDOR)
    const resB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        fullName: 'Bob Hacker',
        email: 'bob@sec-test.com',
        password: 'Password@123'
      }
    });
    const dataB = JSON.parse(resB.body).data;
    userBToken = dataB.accessToken;
    userBId = dataB.user.id;

    const accsBRes = await app.inject({
      method: 'GET',
      url: '/api/v1/accounts',
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    userBAccountId = JSON.parse(accsBRes.body).data[0].id;
  }, 30000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'sec-test' } } });
    await app.close();
    await prisma.$disconnect();
  }, 30000);

  describe('Auditoria Anti-IDOR (Isolamento entre Usuários)', () => {
    it('Bob NÃO deve conseguir excluir ou arquivar a conta da Alice', async () => {
      // Tenta arquivar
      const archRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/accounts/${userAAccountId}/archive`,
        headers: { Authorization: `Bearer ${userBToken}` }
      });
      expect(archRes.statusCode).toBe(404);

      // Tenta excluir
      const delRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/accounts/${userAAccountId}`,
        headers: { Authorization: `Bearer ${userBToken}` }
      });
      expect(delRes.statusCode).toBe(404);
    });

    it('Bob NÃO deve conseguir excluir transações da Alice', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/transactions/${userATransactionId}`,
        headers: { Authorization: `Bearer ${userBToken}` }
      });
      expect(res.statusCode).toBe(404);
    });

    it('Bob NÃO deve conseguir lançar transações na conta da Alice', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/transactions',
        headers: { Authorization: `Bearer ${userBToken}` },
        payload: {
          accountId: userAAccountId, // IDOR na conta de origem
          type: 'EXPENSE',
          amountCents: '5000',
          description: 'Ataque IDOR de Débito',
          date: new Date().toISOString()
        }
      });
      expect(res.statusCode).toBe(404);
    });

    it('Bob NÃO deve conseguir usar conta da Alice como destino de transferência', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/transactions',
        headers: { Authorization: `Bearer ${userBToken}` },
        payload: {
          accountId: userBAccountId,
          destinationAccountId: userAAccountId, // IDOR na conta de destino
          type: 'TRANSFER',
          amountCents: '1000',
          description: 'Transferência para conta alheia',
          date: new Date().toISOString()
        }
      });
      expect(res.statusCode).toBe(404);
    });

    it('Bob NÃO deve conseguir lançar compra no cartão de crédito da Alice', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/cards/${userACardId}/purchases`,
        headers: { Authorization: `Bearer ${userBToken}` },
        payload: {
          description: 'Compra Não Autorizada',
          totalAmountCents: '15000',
          purchaseDate: new Date().toISOString()
        }
      });
      expect(res.statusCode).toBe(404);
    });

    it('Bob NÃO deve conseguir aportar na meta financeira da Alice', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/goals/${userAGoalId}/contribute`,
        headers: { Authorization: `Bearer ${userBToken}` },
        payload: {
          accountId: userBAccountId,
          amountCents: '2000'
        }
      });
      expect(res.statusCode).toBe(404);
    });

    it('Bob NÃO deve conseguir definir orçamento usando categoria privada da Alice', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/budgets',
        headers: { Authorization: `Bearer ${userBToken}` },
        payload: {
          categoryId: userACategoryId, // IDOR na categoria
          month: 10,
          year: 2026,
          amountCents: '10000'
        }
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Concorrência & Atomicidade de Saldos (Race Conditions)', () => {
    it('deve processar 10 transações simultâneas concorrentes com cálculo de saldo exato', async () => {
      // 1. Alice começa com R$ 500,00 de saldo inicial adicionado
      await app.inject({
        method: 'POST',
        url: '/api/v1/transactions',
        headers: { Authorization: `Bearer ${userAToken}` },
        payload: {
          accountId: userAAccountId,
          type: 'INCOME',
          amountCents: '50000', // R$ 500,00
          description: 'Depósito Base para Teste de Concorrência',
          date: new Date().toISOString()
        }
      });

      // 2. Dispara 10 despesas de R$ 20,00 (2000 cents) simultaneamente via Promise.all
      // Total de saídas = 10 * R$ 20,00 = R$ 200,00 (20000 cents)
      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        app.inject({
          method: 'POST',
          url: '/api/v1/transactions',
          headers: { Authorization: `Bearer ${userAToken}` },
          payload: {
            accountId: userAAccountId,
            type: 'EXPENSE',
            amountCents: '2000', // R$ 20,00
            description: `Débito Concorrente #${i + 1}`,
            date: new Date().toISOString()
          }
        })
      );

      const results = await Promise.all(concurrentRequests);

      // Todas as 10 devem ter sucesso (status 201)
      for (const res of results) {
        expect(res.statusCode).toBe(201);
      }

      // 3. Consulta saldo final da conta da Alice
      const accRes = await app.inject({
        method: 'GET',
        url: '/api/v1/accounts',
        headers: { Authorization: `Bearer ${userAToken}` }
      });

      const acc = JSON.parse(accRes.body).data.find((a: any) => a.id === userAAccountId);

      // Saldo anterior era R$ 1.000,00 (do beforeAll) + R$ 500,00 - R$ 200,00 = R$ 1.300,00 (130000 cents)
      expect(acc.currentBalanceCents).toBe('130000');
    });
  });

  describe('Cabeçalhos de Segurança HTTP & Cache-Control', () => {
    it('deve incluir cabeçalhos de segurança e proibir cache em rotas financeiras', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard',
        headers: { Authorization: `Bearer ${userAToken}` }
      });

      expect(res.statusCode).toBe(200);

      // Cabeçalhos HTTP de segurança
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['strict-transport-security']).toContain('max-age=');

      // Proteção de dados financeiros confidenciais (No-Store)
      expect(res.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, private');
      expect(res.headers['pragma']).toBe('no-cache');
    });
  });
});
