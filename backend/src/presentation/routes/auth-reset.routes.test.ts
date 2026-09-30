import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { prisma } from '../../infrastructure/database/prisma.js';

describe('Password Reset Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    await prisma.user.deleteMany({ where: { email: { contains: 'reset' } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'reset' } } });
    await app.close();
    await prisma.$disconnect();
  });

  it('deve solicitar recuperação de senha e redefinir com novo token (FIN-003)', async () => {
    // 1. Cadastra usuário
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        fullName: 'Reset Tester',
        email: 'reset.tester@fincontrol.com',
        password: 'SenhaForte123!'
      }
    });

    // 2. Solicita recuperação
    const forgotRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: 'reset.tester@fincontrol.com' }
    });

    expect(forgotRes.statusCode).toBe(200);
    const forgotBody = JSON.parse(forgotRes.body);
    expect(forgotBody.success).toBe(true);
    expect(forgotBody.debugResetToken).toBeDefined();

    // 3. Redefine a senha com o token
    const resetRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: {
        token: forgotBody.debugResetToken,
        newPassword: 'NovaSenhaSegura456!'
      }
    });

    expect(resetRes.statusCode).toBe(200);
    const resetBody = JSON.parse(resetRes.body);
    expect(resetBody.success).toBe(true);

    // 4. Valida login com nova senha
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'reset.tester@fincontrol.com',
        password: 'NovaSenhaSegura456!'
      }
    });

    expect(loginRes.statusCode).toBe(200);

    // 5. Valida que senha antiga não funciona mais
    const oldLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'reset.tester@fincontrol.com',
        password: 'SenhaForte123!'
      }
    });

    expect(oldLoginRes.statusCode).toBe(401);
  });
});
