import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { CreateGoalUseCase } from '../../application/use-cases/create-goal.use-case.js';
import { ListGoalsUseCase } from '../../application/use-cases/list-goals.use-case.js';
import { ContributeGoalUseCase } from '../../application/use-cases/contribute-goal.use-case.js';

export async function goalRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  // GET /api/v1/goals
  fastify.get('/', {
    schema: {
      description: 'Lista metas financeiras com percentual de progresso e projeção de aporte mensal',
      tags: ['Metas']
    }
  }, async (request, reply) => {
    const userId = request.user!.sub;
    const goals = await ListGoalsUseCase.execute(userId);
    return reply.send({ success: true, data: goals });
  });

  // POST /api/v1/goals
  fastify.post('/', {
    schema: {
      description: 'Cadastra nova meta financeira',
      tags: ['Metas'],
      body: {
        type: 'object',
        required: ['name', 'targetAmountCents'],
        properties: {
          name: { type: 'string', minLength: 1 },
          targetAmountCents: { type: 'string' },
          initialAmountCents: { type: 'string' },
          targetDate: { type: 'string' },
          color: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1, 'Nome da meta é obrigatório'),
      targetAmountCents: z.string().regex(/^\d+$/, 'Valor deve ser string em centavos'),
      initialAmountCents: z.string().regex(/^\d+$/).optional(),
      targetDate: z.string().optional(),
      color: z.string().optional()
    });

    const body = schema.parse(request.body);
    const userId = request.user!.sub;

    const goal = await CreateGoalUseCase.execute({
      userId,
      name: body.name,
      targetAmountCents: BigInt(body.targetAmountCents),
      initialAmountCents: body.initialAmountCents ? BigInt(body.initialAmountCents) : undefined,
      targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
      color: body.color
    });

    return reply.status(201).send({ success: true, data: goal });
  });

  // POST /api/v1/goals/:id/contribute
  fastify.post('/:id/contribute', {
    schema: {
      description: 'Registra aporte em meta financeira com débito opcional na conta bancária',
      tags: ['Metas'],
      body: {
        type: 'object',
        required: ['amountCents'],
        properties: {
          amountCents: { type: 'string' },
          accountId: { type: 'string' },
          notes: { type: 'string' },
          date: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { id: goalId } = request.params as { id: string };
    const schema = z.object({
      amountCents: z.string().regex(/^\d+$/, 'Valor deve ser string em centavos'),
      accountId: z.string().uuid().optional(),
      notes: z.string().optional(),
      date: z.string().optional()
    });

    const body = schema.parse(request.body);
    const userId = request.user!.sub;

    const result = await ContributeGoalUseCase.execute({
      userId,
      goalId,
      amountCents: BigInt(body.amountCents),
      accountId: body.accountId,
      notes: body.notes,
      date: body.date ? new Date(body.date) : undefined
    });

    return reply.send({ success: true, data: result });
  });
}
