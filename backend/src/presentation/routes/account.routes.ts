import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { CreateAccountUseCase } from '../../application/use-cases/create-account.use-case.js';
import { ListAccountsUseCase } from '../../application/use-cases/list-accounts.use-case.js';
import { ArchiveAccountUseCase } from '../../application/use-cases/archive-account.use-case.js';
import { DeleteAccountUseCase } from '../../application/use-cases/delete-account.use-case.js';

export async function accountRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  // GET /api/v1/accounts
  fastify.get('/', {
    schema: {
      description: 'Lista contas financeiras do usuário',
      tags: ['Contas']
    }
  }, async (request, reply) => {
    const userId = request.user!.sub;
    const accounts = await ListAccountsUseCase.execute(userId);
    return reply.send({ success: true, data: accounts });
  });

  // POST /api/v1/accounts
  fastify.post('/', {
    schema: {
      description: 'Cadastra nova conta financeira',
      tags: ['Contas'],
      body: {
        type: 'object',
        required: ['name', 'type'],
        properties: {
          name: { type: 'string', minLength: 1 },
          type: { type: 'string' },
          initialBalanceCents: { type: 'string' },
          color: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1, 'Nome da conta é obrigatório'),
      type: z.enum(['CHECKING', 'SAVINGS', 'DIGITAL', 'WALLET', 'INVESTMENT']),
      initialBalanceCents: z.string().optional(),
      color: z.string().optional()
    });

    const body = schema.parse(request.body);
    const userId = request.user!.sub;

    const initialCents = body.initialBalanceCents ? BigInt(body.initialBalanceCents) : 0n;

    const account = await CreateAccountUseCase.execute({
      userId,
      name: body.name,
      type: body.type,
      initialBalanceCents: initialCents,
      color: body.color
    });

    return reply.status(201).send({ success: true, data: account });
  });

  // PATCH /api/v1/accounts/:id/archive
  fastify.patch('/:id/archive', {
    schema: {
      description: 'Arquiva ou desarquiva conta bancária',
      tags: ['Contas']
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.sub;
    const account = await ArchiveAccountUseCase.execute(userId, id);
    return reply.send({ success: true, data: account });
  });

  // DELETE /api/v1/accounts/:id
  fastify.delete('/:id', {
    schema: {
      description: 'Exclui conta bancária (apenas se não houver transações vinculadas)',
      tags: ['Contas']
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.sub;
    const result = await DeleteAccountUseCase.execute(userId, id);
    return reply.send(result);
  });
}
