import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { CreateCardUseCase } from '../../application/use-cases/create-card.use-case.js';
import { ListCardsUseCase } from '../../application/use-cases/list-cards.use-case.js';
import { CreateCardPurchaseUseCase } from '../../application/use-cases/create-card-purchase.use-case.js';

export async function cardRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  // GET /api/v1/cards
  fastify.get('/', {
    schema: {
      description: 'Lista cartões de crédito com cálculo dinâmico de limites e fatura atual',
      tags: ['Cartões de Crédito']
    }
  }, async (request, reply) => {
    const userId = request.user!.sub;
    const cards = await ListCardsUseCase.execute(userId);
    return reply.send({ success: true, data: cards });
  });

  // POST /api/v1/cards
  fastify.post('/', {
    schema: {
      description: 'Cadastra novo cartão de crédito',
      tags: ['Cartões de Crédito'],
      body: {
        type: 'object',
        required: ['name', 'institution', 'limitCents', 'closingDay', 'dueDay'],
        properties: {
          name: { type: 'string', minLength: 1 },
          institution: { type: 'string', minLength: 1 },
          limitCents: { type: 'string' },
          closingDay: { type: 'number', minimum: 1, maximum: 31 },
          dueDay: { type: 'number', minimum: 1, maximum: 31 },
          lastFourDigits: { type: 'string', minLength: 4, maxLength: 4 },
          color: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1, 'Nome do cartão é obrigatório'),
      institution: z.string().min(1, 'Instituição financeira é obrigatória'),
      limitCents: z.string().regex(/^\d+$/, 'Limite deve ser número de centavos em string'),
      closingDay: z.number().int().min(1).max(31),
      dueDay: z.number().int().min(1).max(31),
      lastFourDigits: z.string().length(4).optional(),
      color: z.string().optional()
    });

    const body = schema.parse(request.body);
    const userId = request.user!.sub;

    const card = await CreateCardUseCase.execute({
      userId,
      name: body.name,
      institution: body.institution,
      limitCents: BigInt(body.limitCents),
      closingDay: body.closingDay,
      dueDay: body.dueDay,
      lastFourDigits: body.lastFourDigits,
      color: body.color
    });

    return reply.status(201).send({ success: true, data: card });
  });

  // POST /api/v1/cards/:id/purchases
  fastify.post('/:id/purchases', {
    schema: {
      description: 'Registra compra no cartão (à vista ou parcelada em N vezes)',
      tags: ['Cartões de Crédito'],
      body: {
        type: 'object',
        required: ['description', 'totalAmountCents', 'purchaseDate'],
        properties: {
          description: { type: 'string', minLength: 1 },
          totalAmountCents: { type: 'string' },
          totalInstallments: { type: 'number', minimum: 1, default: 1 },
          categoryId: { type: 'string' },
          purchaseDate: { type: 'string' },
          notes: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { id: cardId } = request.params as { id: string };
    const schema = z.object({
      description: z.string().min(1, 'Descrição é obrigatória'),
      totalAmountCents: z.string().regex(/^\d+$/, 'Valor deve ser número de centavos'),
      totalInstallments: z.number().int().min(1).default(1),
      categoryId: z.string().uuid().optional(),
      purchaseDate: z.string(),
      notes: z.string().optional()
    });

    const body = schema.parse(request.body);
    const userId = request.user!.sub;

    const result = await CreateCardPurchaseUseCase.execute({
      userId,
      cardId,
      categoryId: body.categoryId,
      description: body.description,
      totalAmountCents: BigInt(body.totalAmountCents),
      totalInstallments: body.totalInstallments,
      purchaseDate: new Date(body.purchaseDate),
      notes: body.notes
    });

    return reply.status(201).send({ success: true, data: result });
  });
}
