import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { CreateRecurringUseCase } from '../../application/use-cases/create-recurring.use-case.js';
import { ListRecurringUseCase } from '../../application/use-cases/list-recurring.use-case.js';

export async function recurringRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  // GET /api/v1/recurring
  fastify.get('/', {
    schema: {
      description: 'Lista regras de transações recorrentes ativas',
      tags: ['Recorrências']
    }
  }, async (request, reply) => {
    const userId = request.user!.sub;
    const list = await ListRecurringUseCase.execute(userId);
    return reply.send({ success: true, data: list });
  });

  // POST /api/v1/recurring
  fastify.post('/', {
    schema: {
      description: 'Cadastra nova recorrência e materializa ocorrências em janela móvel de 60 dias',
      tags: ['Recorrências'],
      body: {
        type: 'object',
        required: ['accountId', 'description', 'type', 'amountCents', 'frequency', 'startDate'],
        properties: {
          accountId: { type: 'string' },
          categoryId: { type: 'string' },
          description: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
          amountCents: { type: 'string' },
          frequency: { type: 'string', enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] },
          dayOfMonth: { type: 'number', minimum: 1, maximum: 31 },
          startDate: { type: 'string' },
          endDate: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const schema = z.object({
      accountId: z.string().uuid(),
      categoryId: z.string().uuid().optional(),
      description: z.string().min(1, 'Descrição é obrigatória'),
      type: z.enum(['INCOME', 'EXPENSE']),
      amountCents: z.string().regex(/^\d+$/, 'Valor deve ser string em centavos'),
      frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
      dayOfMonth: z.number().int().min(1).max(31).optional(),
      startDate: z.string(),
      endDate: z.string().optional()
    });

    const body = schema.parse(request.body);
    const userId = request.user!.sub;

    const result = await CreateRecurringUseCase.execute({
      userId,
      accountId: body.accountId,
      categoryId: body.categoryId,
      description: body.description,
      type: body.type,
      amountCents: BigInt(body.amountCents),
      frequency: body.frequency,
      dayOfMonth: body.dayOfMonth,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined
    });

    return reply.status(201).send({ success: true, data: result });
  });
}
