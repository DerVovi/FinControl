import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { prisma } from '../../infrastructure/database/prisma.js';

describe('Sprint 2 — Core Financeiro & Garantia de Não Duplicação de Despesas', () => {
  let app: FastifyInstance;
  let token: string;
  let userId: string;
  let mainAccountId: string;
  let foodCategoryId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    await prisma.user.deleteMany({ where: { email: { contains: 'financeiro.tester' } } });

    // 1. Cadastra o usuário
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        fullName: 'Financeiro Tester',
        email: 'financeiro.tester@fincontrol.com',
        password: 'SenhaForte123!'
      }
    });

    const regData = JSON.parse(regRes.body).data;
    token = regData.accessToken;
    userId = regData.user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'financeiro.tester' } } });
    await app.close();
    await prisma.$disconnect();
  });

  it('deve ter instalado a Conta Principal e 15 categorias automaticamente no registro do usuário', async () => {
    const accRes = await app.inject({
      method: 'GET',
      url: '/api/v1/accounts',
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(accRes.statusCode).toBe(200);
    const accounts = JSON.parse(accRes.body).data;
    expect(accounts.length).toBe(1);
    expect(accounts[0].name).toBe('Conta Principal');
    expect(accounts[0].currentBalanceCents).toBe('0');
    mainAccountId = accounts[0].id;

    const catRes = await app.inject({
      method: 'GET',
      url: '/api/v1/categories',
      headers: { Authorization: `Bearer ${token}` }
    });

    const categories = JSON.parse(catRes.body).data;
    expect(categories.length).toBe(15);
    const foodCat = categories.find((c: any) => c.name === 'Alimentação');
    expect(foodCat).toBeDefined();
    foodCategoryId = foodCat.id;
  });

  it('deve permitir criar uma segunda conta ("Nubank") com saldo inicial', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/accounts',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        name: 'Nubank',
        type: 'CHECKING',
        initialBalanceCents: '100000', // R$ 1.000,00
        color: '#8B5CF6'
      }
    });

    expect(res.statusCode).toBe(201);
    const nubank = JSON.parse(res.body).data;
    expect(nubank.name).toBe('Nubank');
    expect(nubank.currentBalanceCents).toBe('100000');
  });

  it('deve registrar receita e despesa e atualizar o saldo atômico da conta', async () => {
    // 1. Receita: R$ 3.000,00 (300000 centavos) na Conta Principal
    const incRes = await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        accountId: mainAccountId,
        type: 'INCOME',
        amountCents: '300000',
        date: new Date().toISOString(),
        description: 'Salário Mensal'
      }
    });
    expect(incRes.statusCode).toBe(201);

    // 2. Despesa: R$ 250,00 (25000 centavos) na Conta Principal
    const expRes = await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        accountId: mainAccountId,
        categoryId: foodCategoryId,
        type: 'EXPENSE',
        amountCents: '25000',
        date: new Date().toISOString(),
        description: 'Supermercado'
      }
    });
    expect(expRes.statusCode).toBe(201);

    // Verifica saldo da Conta Principal: 0 + 3000 - 250 = 2750,00
    const accRes = await app.inject({
      method: 'GET',
      url: '/api/v1/accounts',
      headers: { Authorization: `Bearer ${token}` }
    });
    const accounts = JSON.parse(accRes.body).data;
    const mainAcc = accounts.find((a: any) => a.id === mainAccountId);
    expect(mainAcc.currentBalanceCents).toBe('275000');
  });

  it('GARANTIA DE NÃO DUPLICAÇÃO 1: Transferência entre contas NÃO altera receitas nem despesas do mês', async () => {
    // Obtém ID da conta Nubank
    const accListRes = await app.inject({
      method: 'GET',
      url: '/api/v1/accounts',
      headers: { Authorization: `Bearer ${token}` }
    });
    const accountsBefore = JSON.parse(accListRes.body).data;
    const nubankAcc = accountsBefore.find((a: any) => a.name === 'Nubank');

    // Transfere R$ 1.000,00 da Conta Principal para Nubank
    const transRes = await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        accountId: mainAccountId,
        destinationAccountId: nubankAcc.id,
        type: 'TRANSFER',
        amountCents: '100000',
        date: new Date().toISOString(),
        description: 'Transferência para Nubank'
      }
    });

    expect(transRes.statusCode).toBe(201);

    // Verifica saldos das contas:
    // Conta Principal: 2.750,00 - 1.000,00 = 1.750,00 (175000)
    // Nubank: 1.000,00 + 1.000,00 = 2.000,00 (200000)
    const accListAfter = await app.inject({
      method: 'GET',
      url: '/api/v1/accounts',
      headers: { Authorization: `Bearer ${token}` }
    });
    const accountsAfter = JSON.parse(accListAfter.body).data;
    const mainAcc = accountsAfter.find((a: any) => a.id === mainAccountId);
    const nubank = accountsAfter.find((a: any) => a.name === 'Nubank');

    expect(mainAcc.currentBalanceCents).toBe('175000');
    expect(nubank.currentBalanceCents).toBe('200000');

    // CRÍTICO: Consulta o Dashboard
    // Despesas do mês devem permanecer ESTRITAMENTE em R$ 250,00 (não R$ 1.250,00)!
    // Receitas do mês devem permanecer ESTRITAMENTE em R$ 3.000,00 (não R$ 4.000,00)!
    const dashRes = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard',
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(dashRes.statusCode).toBe(200);
    const dashboard = JSON.parse(dashRes.body).data;

    expect(dashboard.summary.monthExpenseCents).toBe('25000');
    expect(dashboard.summary.formattedMonthExpense).toBe('R$ 250,00');

    expect(dashboard.summary.monthIncomeCents).toBe('300000');
    expect(dashboard.summary.formattedMonthIncome).toBe('R$ 3.000,00');

    // Saldo Consolidado: 1750 + 2000 = 3750,00
    expect(dashboard.summary.consolidatedBalanceCents).toBe('375000');
  });

  it('GARANTIA DE NÃO DUPLICAÇÃO 2: Pagamento de fatura (INVOICE_PAYMENT) NÃO duplica as despesas do mês', async () => {
    // Pagamento de fatura de R$ 500,00 saindo da Nubank
    const accListRes = await app.inject({
      method: 'GET',
      url: '/api/v1/accounts',
      headers: { Authorization: `Bearer ${token}` }
    });
    const nubankAcc = JSON.parse(accListRes.body).data.find((a: any) => a.name === 'Nubank');

    const payRes = await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        accountId: nubankAcc.id,
        type: 'INVOICE_PAYMENT',
        amountCents: '50000',
        date: new Date().toISOString(),
        description: 'Pagamento de Fatura de Cartão'
      }
    });

    expect(payRes.statusCode).toBe(201);

    // Consulta Dashboard novamente:
    // As Despesas de consumo do mês CONTINUAM sendo R$ 250,00 (não 750,00 nem 1.750,00)!
    const dashRes = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard',
      headers: { Authorization: `Bearer ${token}` }
    });

    const dashboard = JSON.parse(dashRes.body).data;
    expect(dashboard.summary.monthExpenseCents).toBe('25000');
    expect(dashboard.summary.formattedMonthExpense).toBe('R$ 250,00');

    // E o saldo da conta Nubank foi devidamente debitado: 2.000,00 - 500,00 = 1.500,00
    const nubankAfterRes = await app.inject({
      method: 'GET',
      url: '/api/v1/accounts',
      headers: { Authorization: `Bearer ${token}` }
    });
    const nubankAfter = JSON.parse(nubankAfterRes.body).data.find((a: any) => a.name === 'Nubank');
    expect(nubankAfter.currentBalanceCents).toBe('150000');
  });

  it('deve bloquear exclusão física de conta com transações associadas e permitir arquivamento', async () => {
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/accounts/${mainAccountId}`,
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(delRes.statusCode).toBe(400);
    const body = JSON.parse(delRes.body);
    expect(body.error.code).toBe('ACCOUNT_HAS_TRANSACTIONS');

    // Arquivar a conta
    const archiveRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/accounts/${mainAccountId}/archive`,
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(archiveRes.statusCode).toBe(200);
    expect(JSON.parse(archiveRes.body).data.status).toBe('ARCHIVED');
  });
});
