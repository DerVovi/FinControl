import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { ListCategoriesUseCase } from '../../application/use-cases/list-categories.use-case.js';
import { CreateCategoryUseCase } from '../../application/use-cases/create-category.use-case.js';

export async function categoryRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  // GET /api/v1/categories
  fastify.get('/', {
    schema: {
      description: 'Lista categorias de receitas e despesas disponíveis para o usuário',
      tags: ['Categorias']
    }
  }, async (request, reply) => {
    const userId = request.user!.sub;
    const { type } = request.query as { type?: string };
    const categories = await ListCategoriesUseCase.execute(userId, type);
    return reply.send({ success: true, data: categories });
  });

  // POST /api/v1/categories
  fastify.post('/', {
    schema: {
      description: 'Cria nova categoria personalizada',
      tags: ['Categorias'],
      body: {
        type: 'object',
        required: ['name', 'type'],
        properties: {
          name: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
          icon: { type: 'string' },
          color: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1, 'Nome da categoria é obrigatório'),
      type: z.enum(['INCOME', 'EXPENSE']),
      icon: z.string().optional(),
      color: z.string().optional()
    });

    const body = schema.parse(request.body);
    const userId = request.user!.sub;

    const category = await CreateCategoryUseCase.execute({
      userId,
      ...body
    });

    return reply.status(201).send({ success: true, data: category });
  });
}
