import { FastifyInstance } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', {
    schema: {
      description: 'Verificação de integridade da API e Banco de Dados',
      tags: ['Sistema']
    }
  }, async () => {
    let dbStatus = 'disconnected';
    let dbError = null;
    let userCount = 0;
    try {
      userCount = await prisma.user.count();
      dbStatus = 'connected';
    } catch (err: any) {
      dbError = err.message;
    }

    return {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      service: 'fincontrol-api',
      database: dbStatus,
      usersInDb: userCount,
      dbError,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  });
}
