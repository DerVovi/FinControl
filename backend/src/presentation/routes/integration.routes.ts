import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { ManageWebhookKeyUseCase } from '../../application/use-cases/manage-webhook-key.use-case.js';
import { ProcessWalletWebhookUseCase } from '../../application/use-cases/process-wallet-webhook.use-case.js';

export async function integrationRoutes(fastify: FastifyInstance) {
  // 1. Webhook Público da Carteira do Google (Autenticado por X-Api-Key)
  fastify.post('/webhook/wallet', {
    schema: {
      description: 'Webhook para receber notificações de pagamentos da Carteira do Google / Android',
      tags: ['Integrações'],
      headers: {
        type: 'object',
        properties: {
          'x-api-key': { type: 'string', description: 'Chave de API exclusiva do Webhook' }
        }
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          text: { type: 'string' },
          raw: { type: 'string' },
          amountCents: { type: 'string' },
          description: { type: 'string' },
          lastFourDigits: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const apiKey = (request.headers['x-api-key'] as string) ||
                   (request.headers['authorization']?.replace(/^Bearer\s+/i, '')) ||
                   ((request.query as any)?.key as string) ||
                   '';

    const schema = z.object({
      title: z.string().optional(),
      text: z.string().optional(),
      raw: z.string().optional(),
      amountCents: z.string().optional(),
      description: z.string().optional(),
      lastFourDigits: z.string().optional()
    });

    const body = schema.parse(request.body || {});

    const result = await ProcessWalletWebhookUseCase.execute({
      apiKey,
      ...body
    });

    const statusCode = result.duplicate ? 200 : 201;
    return reply.status(statusCode).send({
      success: true,
      data: result
    });
  });

  // Rotas autenticadas para o usuário configurar e testar o Webhook no Frontend
  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook('preHandler', authMiddleware);

    // GET /api/v1/integrations/webhook/config
    protectedRoutes.get('/webhook/config', {
      schema: {
        description: 'Obtém as configurações e status da integração de notificações da Carteira do Google',
        tags: ['Integrações']
      }
    }, async (request, reply) => {
      const userId = request.user!.sub;
      const config = await ManageWebhookKeyUseCase.getConfig(userId);

      return reply.send({
        success: true,
        data: {
          ...config,
          webhookEndpoint: '/api/v1/integrations/webhook/wallet',
          instructions: {
            app: 'MacroDroid (Android)',
            trigger: 'Notificação Recebida -> Aplicativo Carteira do Google',
            action: 'Fazer Requisição HTTP (POST)',
            header: 'X-Api-Key: sua_chave_aqui'
          }
        }
      });
    });

    // POST /api/v1/integrations/webhook/regenerate
    protectedRoutes.post('/webhook/regenerate', {
      schema: {
        description: 'Gera ou revoga/substitui a chave de API do Webhook para o usuário',
        tags: ['Integrações']
      }
    }, async (request, reply) => {
      const userId = request.user!.sub;
      const keyData = await ManageWebhookKeyUseCase.generateOrRegenerateKey(userId);

      return reply.status(201).send({
        success: true,
        data: keyData
      });
    });

    // POST /api/v1/integrations/webhook/simulate
    protectedRoutes.post('/webhook/simulate', {
      schema: {
        description: 'Simula o disparo de uma notificação da Carteira do Google para teste imediato',
        tags: ['Integrações'],
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            text: { type: 'string' },
            raw: { type: 'string' }
          }
        }
      }
    }, async (request, reply) => {
      const userId = request.user!.sub;

      // Obtém ou gera a chave para simular
      let config = await ManageWebhookKeyUseCase.getConfig(userId);
      let keyToUse: string;

      if (!config.configured) {
        const generated = await ManageWebhookKeyUseCase.generateOrRegenerateKey(userId);
        keyToUse = generated.apiKey;
      } else {
        // Se já existe, geramos uma chamada interna criando a chave se necessário ou simulando direto
        const record = await ManageWebhookKeyUseCase.generateOrRegenerateKey(userId);
        keyToUse = record.apiKey;
      }

      const schema = z.object({
        title: z.string().optional(),
        text: z.string().optional(),
        raw: z.string().optional()
      });

      const body = schema.parse(request.body || {});

      const result = await ProcessWalletWebhookUseCase.execute({
        apiKey: keyToUse,
        ...body
      });

      return reply.status(result.duplicate ? 200 : 201).send({
        success: true,
        data: result
      });
    });
  });
}
