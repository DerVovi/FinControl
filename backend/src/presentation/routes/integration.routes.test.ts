import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { prisma } from '../../infrastructure/database/prisma.js';

describe('Integração — Webhook da Carteira do Google (FIN-019 & FIN-020)', () => {
  let app: FastifyInstance;
  let userToken: string;
  let userId: string;
  let cardId: string;
  let accountId: string;
  let apiKey: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Limpa apenas dados de testes anteriores
    await prisma.user.deleteMany({
      where: { email: { contains: 'wallet-test' } }
    });

    // 1. Cria usuário de teste
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        fullName: 'Usuário Carteira Google',
        email: 'wallet-test@exemplo.com',
        password: 'SenhaForte123!'
      }
    });

    const regBody = JSON.parse(regRes.body);
    userToken = regBody.data.accessToken;
    userId = regBody.data.user.id;

    // 2. Localiza a conta bancária inicial criada no registro
    const acc = await prisma.account.findFirst({
      where: { userId }
    });
    accountId = acc!.id;

    // 3. Cria cartão de crédito com final 1234
    const card = await prisma.creditCard.create({
      data: {
        userId,
        name: 'Nubank Ultravioleta',
        institution: 'Nubank',
        limitCents: 500000n, // R$ 5.000,00
        closingDay: 20,
        dueDay: 27,
        lastFourDigits: '1234'
      }
    });
    cardId = card.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'wallet-test' } }
    });
    await app.close();
  });

  it('deve obter status inicial não configurado e gerar nova chave de API (POST /regenerate)', async () => {
    // 1. Consulta config inicial
    const confRes = await app.inject({
      method: 'GET',
      url: '/api/v1/integrations/webhook/config',
      headers: { Authorization: `Bearer ${userToken}` }
    });

    expect(confRes.statusCode).toBe(200);
    const confBody = JSON.parse(confRes.body);
    expect(confBody.data.configured).toBe(false);

    // 2. Gera chave de API
    const genRes = await app.inject({
      method: 'POST',
      url: '/api/v1/integrations/webhook/regenerate',
      headers: { Authorization: `Bearer ${userToken}` }
    });

    expect(genRes.statusCode).toBe(201);
    const genBody = JSON.parse(genRes.body);
    expect(genBody.data.apiKey).toMatch(/^fc_whk_[a-f0-9]{64}$/);
    expect(genBody.data.maskedKey).toMatch(/^fc_whk_••••••••[a-f0-9]{4}$/);

    apiKey = genBody.data.apiKey;
  });

  it('deve rejeitar requisição sem chave ou com chave de API inválida (401 Unauthorized)', async () => {
    const resNoKey = await app.inject({
      method: 'POST',
      url: '/api/v1/integrations/webhook/wallet',
      payload: { text: 'R$ 25,00 pago em Padaria' }
    });
    expect(resNoKey.statusCode).toBe(401);

    const resBadKey = await app.inject({
      method: 'POST',
      url: '/api/v1/integrations/webhook/wallet',
      headers: { 'x-api-key': 'fc_whk_invalid123456' },
      payload: { text: 'R$ 25,00 pago em Padaria' }
    });
    expect(resBadKey.statusCode).toBe(401);
  });

  it('deve processar notificação e lançar despesa no cartão correto pelo final 1234 (FIN-019)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/integrations/webhook/wallet',
      headers: { 'x-api-key': apiKey },
      payload: {
        title: 'Padaria Central',
        text: 'R$ 28,50 pago com Mastercard final 1234'
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.duplicate).toBe(false);
    expect(body.data.type).toBe('CARD_PURCHASE');
    expect(body.data.amountCents).toBe('2850');
    expect(body.data.description).toBe('Padaria Central');
    expect(body.data.cardId).toBe(cardId);
  });

  it('deve deduplicar e retornar status idempotente se receber notificação repetida nos últimos 5 minutos (FIN-020)', async () => {
    const duplicateRes = await app.inject({
      method: 'POST',
      url: '/api/v1/integrations/webhook/wallet',
      headers: { 'x-api-key': apiKey },
      payload: {
        title: 'Padaria Central',
        text: 'R$ 28,50 pago com Mastercard final 1234'
      }
    });

    expect(duplicateRes.statusCode).toBe(200);
    const body = JSON.parse(duplicateRes.body);
    expect(body.data.duplicate).toBe(true);
    expect(body.data.message).toContain('idempotência garantida');
  });

  it('deve lançar em conta bancária caso o cartão não seja reconhecido ou não tenha final informado', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/integrations/webhook/wallet',
      headers: { 'x-api-key': apiKey },
      payload: {
        title: 'Posto Shell',
        text: 'R$ 100,00 pago com cartão final 9999' // 9999 não cadastrado
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.type).toBe('ACCOUNT_EXPENSE');
    expect(body.data.amountCents).toBe('10000');
    expect(body.data.description).toBe('Posto Shell');
    expect(body.data.accountId).toBe(accountId);
  });

  it('deve permitir simulação pelo usuário autenticado (POST /simulate)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/integrations/webhook/simulate',
      headers: { Authorization: `Bearer ${userToken}` },
      payload: {
        title: 'Restaurante Sabor Brasil',
        text: 'R$ 55,00 pago com Visa final 1234'
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.type).toBe('CARD_PURCHASE');
    expect(body.data.amountCents).toBe('5500');
    expect(body.data.description).toBe('Restaurante Sabor Brasil');
  });
});
