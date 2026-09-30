import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { prisma } from '../../infrastructure/database/prisma.js';

describe('Sprint 3 — Cartões de Crédito, Faturas e Parcelamentos (FIN-010 a FIN-012)', () => {
  let app: FastifyInstance;
  let token: string;
  let bankAccountId: string;
  let cardId: string;
  let currentInvoiceId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    await prisma.user.deleteMany({ where: { email: { contains: 'cartao.tester' } } });

    // 1. Cadastra usuário
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        fullName: 'Cartão Tester',
        email: 'cartao.tester@fincontrol.com',
        password: 'SenhaForte123!'
      }
    });

    const regData = JSON.parse(regRes.body).data;
    token = regData.accessToken;

    // 2. Busca conta bancária gerada automaticamente e adiciona saldo para pagar faturas
    const accRes = await app.inject({
      method: 'GET',
      url: '/api/v1/accounts',
      headers: { Authorization: `Bearer ${token}` }
    });
    bankAccountId = JSON.parse(accRes.body).data[0].id;

    // Lança R$ 5.000,00 de receita na conta bancária
    await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        accountId: bankAccountId,
        type: 'INCOME',
        amountCents: '500000',
        date: new Date().toISOString(),
        description: 'Saldo para pagamento de contas'
      }
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'cartao.tester' } } });
    await app.close();
    await prisma.$disconnect();
  });

  it('deve cadastrar um cartão de crédito com limite de R$ 5.000,00 (FIN-010)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/cards',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        name: 'Nubank Ultravioleta',
        institution: 'Nubank',
        limitCents: '500000', // R$ 5.000,00
        closingDay: 20,
        dueDay: 27,
        lastFourDigits: '9876',
        color: '#820AD1'
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body).data;
    expect(body.name).toBe('Nubank Ultravioleta');
    expect(body.limitCents).toBe('500000');
    expect(body.initialInvoice).toBeDefined();
    expect(body.initialInvoice.status).toBe('OPEN');
    cardId = body.id;
    currentInvoiceId = body.initialInvoice.id;
  });

  it('deve listar cartões e exibir limites dinâmicos disponíveis e comprometidos', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/cards',
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.statusCode).toBe(200);
    const cards = JSON.parse(res.body).data;
    expect(cards).toHaveLength(1);
    expect(cards[0].formattedLimit).toBe('R$ 5.000,00');
    expect(cards[0].formattedCompromised).toBe('R$ 0,00');
    expect(cards[0].formattedAvailable).toBe('R$ 5.000,00');
    expect(cards[0].currentInvoice).toBeDefined();
    expect(cards[0].currentInvoice.id).toBe(currentInvoiceId);
  });

  it('deve registrar compra à vista no cartão e atualizar o total da fatura e limite disponível', async () => {
    // Compra no ciclo atual aberto
    const purchaseDate = new Date();

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/cards/${cardId}/purchases`,
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        description: 'Jantar Restaurante',
        totalAmountCents: '20000', // R$ 200,00
        totalInstallments: 1,
        purchaseDate: purchaseDate.toISOString()
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body).data;
    expect(body.type).toBe('SINGLE');
    expect(body.invoice.id).toBe(currentInvoiceId);

    // Verifica limite do cartão: Limite R$ 5.000, comprometido R$ 200, disponível R$ 4.800
    const cardRes = await app.inject({
      method: 'GET',
      url: '/api/v1/cards',
      headers: { Authorization: `Bearer ${token}` }
    });
    const card = JSON.parse(cardRes.body).data[0];
    expect(card.formattedCompromised).toBe('R$ 200,00');
    expect(card.formattedAvailable).toBe('R$ 4.800,00');
    expect(card.currentInvoice.formattedTotal).toBe('R$ 200,00');
  });

  it('deve registrar compra parcelada em 12x (Notebook R$ 1.200,00) com distribuição em faturas mensais (FIN-012)', async () => {
    const purchaseDate = new Date();

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/cards/${cardId}/purchases`,
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        description: 'Notebook Trabalho',
        totalAmountCents: '120000', // R$ 1.200,00
        totalInstallments: 12,
        purchaseDate: purchaseDate.toISOString()
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body).data;
    expect(body.type).toBe('INSTALLMENTS');
    expect(body.installments).toHaveLength(12);

    // Cada parcela deve ter exatamente R$ 100,00 (10000 centavos)
    for (const inst of body.installments) {
      expect(inst.amountCents).toBe('10000');
    }

    // Limite disponível agora deve ter comprometido: R$ 200 (à vista) + R$ 1.200 (parcelado) = R$ 1.400
    // Disponível: R$ 5.000 - R$ 1.400 = R$ 3.600
    const cardRes = await app.inject({
      method: 'GET',
      url: '/api/v1/cards',
      headers: { Authorization: `Bearer ${token}` }
    });
    const card = JSON.parse(cardRes.body).data[0];
    expect(card.formattedCompromised).toBe('R$ 1.400,00');
    expect(card.formattedAvailable).toBe('R$ 3.600,00');

    // Fatura atual aberta agora tem: R$ 200 (à vista) + R$ 100 (parcela 1/12) = R$ 300,00
    expect(card.currentInvoice.formattedTotal).toBe('R$ 300,00');
  });

  it('deve consultar detalhes da fatura e listar compras à vista e parcela com indicador "1/12"', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/invoices/${currentInvoiceId}`,
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.statusCode).toBe(200);
    const invoice = JSON.parse(res.body).data;
    expect(invoice.formattedTotal).toBe('R$ 300,00');
    expect(invoice.transactions.length).toBeGreaterThanOrEqual(1); // Jantar Restaurante
    expect(invoice.installments).toHaveLength(1); // Parcela 1/12 do Notebook
    expect(invoice.installments[0].installmentLabel).toBe('1/12');
  });

  it('deve realizar pagamento da fatura debitando conta bancária e restabelecendo limite do cartão (FIN-011)', async () => {
    // Paga integralmente os R$ 300,00 da fatura atual
    const payRes = await app.inject({
      method: 'POST',
      url: `/api/v1/invoices/${currentInvoiceId}/pay`,
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        accountId: bankAccountId,
        amountCents: '30000' // R$ 300,00
      }
    });

    expect(payRes.statusCode).toBe(200);
    const payData = JSON.parse(payRes.body).data;
    expect(payData.invoice.status).toBe('PAID');
    expect(payData.invoice.remainingCents).toBe('0');

    // Saldo bancário foi debitado: R$ 5.000 - R$ 300 = R$ 4.700
    const accRes = await app.inject({
      method: 'GET',
      url: '/api/v1/accounts',
      headers: { Authorization: `Bearer ${token}` }
    });
    const bankAcc = JSON.parse(accRes.body).data.find((a: any) => a.id === bankAccountId);
    expect(bankAcc.currentBalanceCents).toBe('470000');

    // Limite disponível do cartão aumentou em R$ 300: R$ 3.600 + R$ 300 = R$ 3.900
    const cardRes = await app.inject({
      method: 'GET',
      url: '/api/v1/cards',
      headers: { Authorization: `Bearer ${token}` }
    });
    const card = JSON.parse(cardRes.body).data[0];
    expect(card.formattedAvailable).toBe('R$ 3.900,00');
  });
});
