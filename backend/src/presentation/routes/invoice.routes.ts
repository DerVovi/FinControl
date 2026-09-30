import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { GetInvoiceUseCase } from '../../application/use-cases/get-invoice.use-case.js';
import { PayInvoiceUseCase } from '../../application/use-cases/pay-invoice.use-case.js';

export async function invoiceRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  // GET /api/v1/invoices/:id
  fastify.get('/:id', {
    schema: {
      description: 'Retorna os detalhes da fatura com itens à vista e parcelas',
      tags: ['Faturas']
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.sub;
    const invoice = await GetInvoiceUseCase.execute(userId, id);
    return reply.send({ success: true, data: invoice });
  });

  // POST /api/v1/invoices/:id/pay
  fastify.post('/:id/pay', {
    schema: {
      description: 'Efetua o pagamento total ou parcial da fatura debitando uma conta bancária sem duplicar despesas',
      tags: ['Faturas'],
      body: {
        type: 'object',
        required: ['accountId', 'amountCents'],
        properties: {
          accountId: { type: 'string' },
          amountCents: { type: 'string' },
          date: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { id: invoiceId } = request.params as { id: string };
    const schema = z.object({
      accountId: z.string().uuid('ID de conta inválido'),
      amountCents: z.string().regex(/^\d+$/, 'Valor deve ser número de centavos em string'),
      date: z.string().optional()
    });

    const body = schema.parse(request.body);
    const userId = request.user!.sub;

    const result = await PayInvoiceUseCase.execute({
      userId,
      invoiceId,
      accountId: body.accountId,
      amountCents: BigInt(body.amountCents),
      date: body.date ? new Date(body.date) : undefined
    });

    return reply.send({ success: true, data: result });
  });
}
