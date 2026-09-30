import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { FastifyInstance } from 'fastify';

describe('Reports & Export API Integration Tests (Sprint 5)', () => {
  let app: FastifyInstance;
  let authToken: string;
  let testUserId: string;
  let sourceAccountId: string;
  let destAccountId: string;
  let categoryAlimentacaoId: string;
  let categorySalarioId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Cria usuário de teste com Conta Principal e categorias semeadas
    const email = `reports_user_${Date.now()}@test.com`;
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        fullName: 'Investidor Reports',
        email,
        password: 'Password@123'
      }
    });

    const regBody = JSON.parse(regRes.body);
    authToken = regBody.data.accessToken;
    testUserId = regBody.data.user.id;

    // Obtém contas
    const accRes = await app.inject({
      method: 'GET',
      url: '/api/v1/accounts',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const accs = JSON.parse(accRes.body).data;
    sourceAccountId = accs[0].id;

    // Cria segunda conta para testar transferência sem dupla contagem
    const acc2Res = await app.inject({
      method: 'POST',
      url: '/api/v1/accounts',
      headers: { Authorization: `Bearer ${authToken}` },
      payload: {
        name: 'Poupança Reserva',
        type: 'SAVINGS',
        initialBalanceCents: '0'
      }
    });
    destAccountId = JSON.parse(acc2Res.body).data.id;

    // Obtém categorias
    const catRes = await app.inject({
      method: 'GET',
      url: '/api/v1/categories',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const cats = JSON.parse(catRes.body).data;
    categoryAlimentacaoId = cats.find((c: any) => c.name === 'Alimentação')?.id || cats[0].id;
    categorySalarioId = cats.find((c: any) => c.name === 'Salário')?.id || cats[0].id;

    const now = new Date();

    // 1. Lança Receita: R$ 5.000,00 (500000 cents)
    await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      headers: { Authorization: `Bearer ${authToken}` },
      payload: {
        accountId: sourceAccountId,
        categoryId: categorySalarioId,
        type: 'INCOME',
        amountCents: '500000',
        description: 'Salário Mensal',
        date: now.toISOString()
      }
    });

    // 2. Lança Despesa: R$ 1.500,00 (150000 cents)
    await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      headers: { Authorization: `Bearer ${authToken}` },
      payload: {
        accountId: sourceAccountId,
        categoryId: categoryAlimentacaoId,
        type: 'EXPENSE',
        amountCents: '150000',
        description: '=Mercado do Mês', // teste de sanitização CSV
        date: now.toISOString()
      }
    });

    // 3. Lança Transferência entre contas: R$ 1.000,00 (100000 cents)
    // NÃO DEVE APARECER EM RECEITAS NEM DESPESAS DO MÊS
    await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      headers: { Authorization: `Bearer ${authToken}` },
      payload: {
        accountId: sourceAccountId,
        destinationAccountId: destAccountId,
        type: 'TRANSFER',
        amountCents: '100000',
        description: 'Aporte para Poupança',
        date: now.toISOString()
      }
    });
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.transaction.deleteMany({ where: { userId: testUserId } });
      await prisma.account.deleteMany({ where: { userId: testUserId } });
      await prisma.category.deleteMany({ where: { userId: testUserId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
    await app.close();
  });

  it('FIN-016: deve retornar DRE pessoal do mês com cálculo exato e sem duplicar transferências', async () => {
    const now = new Date();
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/monthly?month=${now.getMonth() + 1}&year=${now.getFullYear()}`,
      headers: { Authorization: `Bearer ${authToken}` }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);

    const { summary, categoryBreakdown, evolution } = body.data;

    // Receita: 500000 (R$ 5.000,00)
    expect(summary.incomeCents).toBe('500000');
    // Despesa: 150000 (R$ 1.500,00) - Transferência de R$ 1.000,00 estritamente NÃO somada
    expect(summary.expenseCents).toBe('150000');
    // Resultado Líquido: 350000 (R$ 3.500,00)
    expect(summary.netSavingsCents).toBe('350000');
    // Taxa de Poupança: (3500 / 5000) * 100 = 70%
    expect(summary.savingsRate).toBe(70);

    // Distribuição de Categorias
    expect(categoryBreakdown.length).toBeGreaterThan(0);
    expect(categoryBreakdown[0].amountCents).toBe('150000');
    expect(categoryBreakdown[0].percentage).toBe(100);

    // Evolução Histórica (6 meses)
    expect(evolution.length).toBe(6);
  });

  it('FIN-017: deve exportar transações em formato CSV com RFC 4180 e proteção contra CSV Injection', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/export?format=csv',
      headers: { Authorization: `Bearer ${authToken}` }
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename=');

    const csvText = res.body;
    // Verifica presença do BOM UTF-8 (\uFEFF)
    expect(csvText.charCodeAt(0)).toBe(0xFEFF);

    // Verifica cabeçalhos
    expect(csvText).toContain('Data;Descrição;Tipo;Categoria;Conta Origem;Conta Destino;Valor (R$)');

    // Verifica se sanitizou '=Mercado do Mês' com aspas simples para proteger de injeção DDE no Excel
    expect(csvText).toContain("'=Mercado do Mês");

    // Verifica que despesa tem sinal negativo formatado com vírgula
    expect(csvText).toContain('-1500,00');
    // E receita com valor positivo
    expect(csvText).toContain('5000,00');
  });
});
