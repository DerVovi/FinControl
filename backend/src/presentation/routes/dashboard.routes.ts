import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { GetDashboardUseCase } from '../../application/use-cases/get-dashboard.use-case.js';

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  // GET /api/v1/dashboard
  fastify.get('/', {
    schema: {
      description: 'Retorna os indicadores consolidados, distribuição de gastos e extrato recente',
      tags: ['Dashboard']
    }
  }, async (request, reply) => {
    const userId = request.user!.sub;
    const { date } = request.query as { date?: string };

    const queryDate = date ? new Date(date) : new Date();
    const dashboardData = await GetDashboardUseCase.execute(userId, queryDate);

    return reply.send({ success: true, data: dashboardData });
  });
}
