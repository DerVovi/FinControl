import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { GetMonthlyReportUseCase } from '../../application/use-cases/get-monthly-report.use-case.js';
import { ExportTransactionsUseCase } from '../../application/use-cases/export-transactions.use-case.js';
import { z } from 'zod';

export async function reportRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  // GET /api/v1/reports/monthly
  fastify.get('/monthly', {
    schema: {
      description: 'Retorna DRE pessoal mensal, distribuição de despesas e evolução dos últimos 6 meses',
      tags: ['Reports']
    }
  }, async (request, reply) => {
    const userId = request.user!.sub;
    const query = request.query as { month?: string; year?: string };

    const now = new Date();
    const month = query.month ? parseInt(query.month, 10) : now.getMonth() + 1;
    const year = query.year ? parseInt(query.year, 10) : now.getFullYear();

    const report = await GetMonthlyReportUseCase.execute(userId, year, month);
    return reply.send({ success: true, data: report });
  });

  // GET /api/v1/reports/export
  fastify.get('/export', {
    schema: {
      description: 'Exporta o extrato de transações filtrado em formato CSV seguro (RFC 4180)',
      tags: ['Reports']
    }
  }, async (request, reply) => {
    const userId = request.user!.sub;
    const query = request.query as {
      startDate?: string;
      endDate?: string;
      type?: string;
      accountId?: string;
      format?: string;
    };

    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const { csvContent, filename } = await ExportTransactionsUseCase.execute({
      userId,
      startDate,
      endDate,
      type: query.type,
      accountId: query.accountId
    });

    if (query.format === 'csv' || !query.format) {
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      return reply.send(csvContent);
    }

    return reply.send({ success: true, data: { filename, length: csvContent.length } });
  });
}
