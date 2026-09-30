import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { prisma } from '../../infrastructure/database/prisma.js';

describe('Auth API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    // Limpa dados de teste
    await prisma.user.deleteMany({ where: { email: { contains: 'victor.teste' } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'victor.teste' } } });
    await app.close();
    await prisma.$disconnect();
  });

  const testUser = {
    fullName: 'Victor Finanças',
    email: 'victor.teste@fincontrol.com',
    password: 'SenhaForte123!'
  };

  it('deve registrar um novo usuário com sucesso (POST /api/v1/auth/register)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: testUser
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe(testUser.email);
    expect(body.data.user.fullName).toBe(testUser.fullName);
    expect(body.data.accessToken).toBeDefined();

    // Verifica se as categorias padrão foram geradas
    const categories = await prisma.category.findMany({
      where: { userId: body.data.user.id }
    });
    expect(categories.length).toBeGreaterThanOrEqual(15);
  });

  it('deve rejeitar cadastro com e-mail duplicado (409 Conflict)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: testUser
    });

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('CONFLICT');
  });

  it('deve autenticar o usuário com credenciais válidas (POST /api/v1/auth/login)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testUser.email,
        password: testUser.password
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
  });

  it('deve rejeitar login com senha incorreta (401 Unauthorized)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testUser.email,
        password: 'SenhaIncorreta999!'
      }
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('deve obter os dados do perfil com token Bearer válido (GET /api/v1/auth/me)', async () => {
    // 1. Faz login para pegar token
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testUser.email,
        password: testUser.password
      }
    });
    const { accessToken } = JSON.parse(loginRes.body).data;

    // 2. Chama /me
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    expect(meRes.statusCode).toBe(200);
    const body = JSON.parse(meRes.body);
    expect(body.data.email).toBe(testUser.email);
    expect(body.data._count.categories).toBeGreaterThan(0);
  });

  it('deve rejeitar acesso a rota protegida sem token (401)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me'
    });

    expect(res.statusCode).toBe(401);
  });

  it('deve permitir logout e limpar cookies (POST /api/v1/auth/logout)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout'
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
  });

  it('deve renovar a sessão e emitir novo access token (POST /api/v1/auth/refresh)', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testUser.email,
        password: testUser.password
      }
    });

    const { refreshToken } = JSON.parse(loginRes.body).data;

    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken }
    });

    expect(refreshRes.statusCode).toBe(200);
    const refreshBody = JSON.parse(refreshRes.body);
    expect(refreshBody.success).toBe(true);
    expect(refreshBody.data.accessToken).toBeDefined();
    expect(refreshBody.data.refreshToken).toBeDefined();
    expect(refreshBody.data.user.email).toBe(testUser.email);
  });
});
