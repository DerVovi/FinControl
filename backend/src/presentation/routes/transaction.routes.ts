import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { CreateTransactionUseCase } from '../../application/use-cases/create-transaction.use-case.js';
import { ListTransactionsUseCase } from '../../application/use-cases/list-transactions.use-case.js';
import { DeleteTransactionUseCase } from '../../application/use-cases/delete-transaction.use-case.js';

export async function transactionRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  // GET /api/v1/transactions
  fastify.get('/', {
    schema: {
      description: 'Lista transações financeiras filtradas',
      tags: ['Transações']
    }
  }, async (request, reply) => {
    const query = request.query as any;
    const userId = request.user!.sub;

    const result = await ListTransactionsUseCase.execute({
      userId,
      accountId: query.accountId,
      categoryId: query.categoryId,
      type: query.type,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit ? Number(query.limit) : 50,
      offset: query.offset ? Number(query.offset) : 0
    });

    return reply.send({ success: true, ...result });
  });

  // POST /api/v1/transactions
  fastify.post('/', {
    schema: {
      description: 'Cria nova transação (Receita, Despesa, Transferência ou Pagamento de Fatura)',
      tags: ['Transações'],
      body: {
        type: 'object',
        required: ['accountId', 'type', 'amountCents', 'description', 'date'],
        properties: {
          accountId: { type: 'string' },
          destinationAccountId: { type: 'string' },
          categoryId: { type: 'string' },
          type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'TRANSFER', 'INVOICE_PAYMENT'] },
          amountCents: { type: 'string' },
          date: { type: 'string' },
          description: { type: 'string', minLength: 1 },
          notes: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const schema = z.object({
      accountId: z.string().uuid(),
      destinationAccountId: z.string().uuid().optional(),
      categoryId: z.string().uuid().optional(),
      type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'INVOICE_PAYMENT']),
      amountCents: z.string().regex(/^\d+$/, 'Valor deve ser número de centavos em string'),
      date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
      description: z.string().min(1, 'Descrição é obrigatória'),
      notes: z.string().optional()
    });

    const body = schema.parse(request.body);
    const userId = request.user!.sub;

    const transaction = await CreateTransactionUseCase.execute({
      userId,
      accountId: body.accountId,
      destinationAccountId: body.destinationAccountId,
      categoryId: body.categoryId,
      type: body.type,
      amountCents: BigInt(body.amountCents),
      date: new Date(body.date),
      description: body.description,
      notes: body.notes
    });

    return reply.status(201).send({ success: true, data: transaction });
  });

  // DELETE /api/v1/transactions/:id
  fastify.delete('/:id', {
    schema: {
      description: 'Exclui transação financeira e estorna os saldos envolvidos',
      tags: ['Transações']
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.sub;

    const result = await DeleteTransactionUseCase.execute(userId, id);
    return reply.send(result);
  });
}
