import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { SetBudgetUseCase } from '../../application/use-cases/set-budget.use-case.js';
import { ListBudgetsUseCase } from '../../application/use-cases/list-budgets.use-case.js';

export async function budgetRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  // GET /api/v1/budgets
  fastify.get('/', {
    schema: {
      description: 'Lista orçamentos da competência informada com status de consumo e alertas',
      tags: ['Orçamentos']
    }
  }, async (request, reply) => {
    const userId = request.user!.sub;
    const query = request.query as any;

    const now = new Date();
    const month = query.month ? Number(query.month) : now.getMonth() + 1;
    const year = query.year ? Number(query.year) : now.getFullYear();

    const budgets = await ListBudgetsUseCase.execute(userId, month, year);
    return reply.send({ success: true, data: budgets });
  });

  // POST /api/v1/budgets
  fastify.post('/', {
    schema: {
      description: 'Define ou atualiza orçamento para uma categoria em determinado mês',
      tags: ['Orçamentos'],
      body: {
        type: 'object',
        required: ['categoryId', 'month', 'year', 'amountCents'],
        properties: {
          categoryId: { type: 'string' },
          month: { type: 'number', minimum: 1, maximum: 12 },
          year: { type: 'number', minimum: 2020 },
          amountCents: { type: 'string' },
          alertThresholdPct: { type: 'number', minimum: 50, maximum: 100, default: 80 }
        }
      }
    }
  }, async (request, reply) => {
    const schema = z.object({
      categoryId: z.string().uuid(),
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2020),
      amountCents: z.string().regex(/^\d+$/, 'Valor deve ser string em centavos').optional(),
      limitCents: z.string().regex(/^\d+$/, 'Valor deve ser string em centavos').optional(),
      alertThresholdPct: z.number().int().min(50).max(100).optional()
    }).refine((d) => d.amountCents || d.limitCents, {
      message: 'Informe amountCents ou limitCents'
    });

    const body = schema.parse(request.body);
    const userId = request.user!.sub;
    const finalAmountCents = body.amountCents || body.limitCents!;

    const budget = await SetBudgetUseCase.execute({
      userId,
      categoryId: body.categoryId,
      month: body.month,
      year: body.year,
      amountCents: BigInt(finalAmountCents),
      alertThresholdPct: body.alertThresholdPct
    });

    return reply.status(201).send({ success: true, data: budget });
  });
}
