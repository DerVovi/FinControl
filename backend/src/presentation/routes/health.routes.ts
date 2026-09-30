import { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', {
    schema: {
      description: 'Verificação de integridade da API',
      tags: ['Sistema']
    }
  }, async () => {
    return {
      status: 'healthy',
      service: 'fincontrol-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  });
}
