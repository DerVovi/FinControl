import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { prisma } from '../../infrastructure/database/prisma.js';

describe('Sprint 4 — Planejamento: Recorrências, Orçamentos e Metas (FIN-013 a FIN-015)', () => {
  let app: FastifyInstance;
  let token: string;
  let bankAccountId: string;
  let foodCategoryId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    await prisma.user.deleteMany({ where: { email: { contains: 'planejamento.tester' } } });

    // 1. Cadastra usuário
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        fullName: 'Planejamento Tester',
        email: 'planejamento.tester@fincontrol.com',
        password: 'SenhaForte123!'
      }
    });

    const regData = JSON.parse(regRes.body).data;
    token = regData.accessToken;

    // 2. Busca conta bancária gerada automaticamente e categoria Alimentação
    const accRes = await app.inject({
      method: 'GET',
      url: '/api/v1/accounts',
      headers: { Authorization: `Bearer ${token}` }
    });
    bankAccountId = JSON.parse(accRes.body).data[0].id;

    // Alimenta a conta com saldo para aportes
    await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        accountId: bankAccountId,
        type: 'INCOME',
        amountCents: '5000000', // R$ 50.000,00
        date: new Date().toISOString(),
        description: 'Depósito inicial'
      }
    });

    const catRes = await app.inject({
      method: 'GET',
      url: '/api/v1/categories?type=EXPENSE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const categories = JSON.parse(catRes.body).data;
    foodCategoryId = categories.find((c: any) => c.name === 'Alimentação').id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'planejamento.tester' } } });
    await app.close();
    await prisma.$disconnect();
  });

  it('deve cadastrar uma transação recorrente e materializar ocorrências em janela móvel (FIN-013)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/recurring',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        accountId: bankAccountId,
        description: 'Netflix',
        type: 'EXPENSE',
        amountCents: '5590', // R$ 55,90
        frequency: 'MONTHLY',
        dayOfMonth: 15,
        startDate: new Date().toISOString()
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body).data;
    expect(body.description).toBe('Netflix');
    expect(body.amountCents).toBe('5590');
    expect(body.materializedCount).toBeGreaterThanOrEqual(1);

    // Listar recorrências
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/recurring',
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(listRes.statusCode).toBe(200);
    const list = JSON.parse(listRes.body).data;
    expect(list).toHaveLength(1);
    expect(list[0].formattedAmount).toBe('R$ 55,90');
  });

  it('deve definir orçamento e monitorar estados de alerta (80%) e estouro (>100%) (FIN-014)', async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // 1. Define teto de R$ 800,00 para Alimentação
    const setRes = await app.inject({
      method: 'POST',
      url: '/api/v1/budgets',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        categoryId: foodCategoryId,
        month,
        year,
        amountCents: '80000', // R$ 800,00
        alertThresholdPct: 80
      }
    });

    expect(setRes.statusCode).toBe(201);

    // 2. Lança despesa de R$ 640,00 em Alimentação
    await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        accountId: bankAccountId,
        categoryId: foodCategoryId,
        type: 'EXPENSE',
        amountCents: '64000', // R$ 640,00
        date: new Date().toISOString(),
        description: 'Supermercado Mensal'
      }
    });

    // 3. Consulta /budgets
    const listRes1 = await app.inject({
      method: `GET`,
      url: `/api/v1/budgets?month=${month}&year=${year}`,
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(listRes1.statusCode).toBe(200);
    const budgets1 = JSON.parse(listRes1.body).data;
    const foodBudget1 = budgets1.find((b: any) => b.categoryId === foodCategoryId);
    expect(foodBudget1.formattedLimit).toBe('R$ 800,00');
    expect(foodBudget1.formattedSpent).toBe('R$ 640,00');
    expect(foodBudget1.formattedRemaining).toBe('R$ 160,00');
    expect(foodBudget1.percentage).toBe(80);
    expect(foodBudget1.status).toBe('WARNING'); // Atingiu o alerta de 80%

    // 4. Lança mais R$ 200,00 de despesa (Total R$ 840,00 > R$ 800,00)
    await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        accountId: bankAccountId,
        categoryId: foodCategoryId,
        type: 'EXPENSE',
        amountCents: '20000', // R$ 200,00
        date: new Date().toISOString(),
        description: 'Restaurante Fim de Semana'
      }
    });

    // 5. Consulta novamente: Deve estar EXCEEDED (>100%)
    const listRes2 = await app.inject({
      method: 'GET',
      url: `/api/v1/budgets?month=${month}&year=${year}`,
      headers: { Authorization: `Bearer ${token}` }
    });
    const foodBudget2 = JSON.parse(listRes2.body).data.find((b: any) => b.categoryId === foodCategoryId);
    expect(foodBudget2.formattedSpent).toBe('R$ 840,00');
    expect(foodBudget2.percentage).toBe(105);
    expect(foodBudget2.status).toBe('EXCEEDED');
  });

  it('deve cadastrar meta financeira, acompanhar evolução e registrar aporte com débito em conta (FIN-015)', async () => {
    // Alvo: R$ 40.000,00, Atual: R$ 12.500,00 (Exemplo do Prompt Mestre)
    const targetDate = new Date();
    targetDate.setFullYear(targetDate.getFullYear() + 2); // 24 meses

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/goals',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        name: 'Comprar Carro',
        targetAmountCents: '4000000', // R$ 40.000,00
        initialAmountCents: '1250000', // R$ 12.500,00
        targetDate: targetDate.toISOString(),
        color: '#3B82F6'
      }
    });

    expect(createRes.statusCode).toBe(201);
    const goal = JSON.parse(createRes.body).data;
    const goalId = goal.id;

    // Consulta lista de metas: deve exibir 31.3% concluído
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/goals',
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(listRes.statusCode).toBe(200);
    const goals = JSON.parse(listRes.body).data;
    const carGoal = goals.find((g: any) => g.id === goalId);
    expect(carGoal.formattedTarget).toBe('R$ 40.000,00');
    expect(carGoal.formattedCurrent).toBe('R$ 12.500,00');
    expect(carGoal.formattedRemaining).toBe('R$ 27.500,00');
    expect(carGoal.percentage).toBe(31.3);
    expect(carGoal.suggestedMonthlyContribution).toBeDefined();

    // Realiza aporte de R$ 2.500,00 saindo da conta bancária
    const contribRes = await app.inject({
      method: 'POST',
      url: `/api/v1/goals/${goalId}/contribute`,
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        amountCents: '250000', // R$ 2.500,00
        accountId: bankAccountId,
        notes: 'Aporte de bônus'
      }
    });

    expect(contribRes.statusCode).toBe(200);
    const updatedGoal = JSON.parse(contribRes.body).data.goal;
    // 12.500 + 2.500 = 15.000,00
    expect(updatedGoal.currentAmountCents).toBe('1500000');
  });
});
