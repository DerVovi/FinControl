import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { AppError } from './errors/app-error.js';
import { authRoutes } from './routes/auth.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { accountRoutes } from './routes/account.routes.js';
import { categoryRoutes } from './routes/category.routes.js';
import { transactionRoutes } from './routes/transaction.routes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { cardRoutes } from './routes/card.routes.js';
import { invoiceRoutes } from './routes/invoice.routes.js';
import { recurringRoutes } from './routes/recurring.routes.js';
import { budgetRoutes } from './routes/budget.routes.js';
import { goalRoutes } from './routes/goal.routes.js';
import { reportRoutes } from './routes/report.routes.js';
import { integrationRoutes } from './routes/integration.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.NODE_ENV === 'test' ? false : true
  });

  // CORS com suporte a Mobile (sem origin), Localhost e Nuvem
  await app.register(cors, {
    origin: (origin, cb) => {
      // Requisições diretas de apps mobile (WebView/React Native) ou ferramentas CLI não possuem header Origin
      if (!origin) return cb(null, true);
      // Ambientes de desenvolvimento ou domínios configurados
      if (
        env.NODE_ENV !== 'production' ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin === env.CLIENT_URL ||
        origin.endsWith('.onrender.com') ||
        origin.endsWith('.vercel.app')
      ) {
        return cb(null, true);
      }
      return cb(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });

  // Cookies
  await app.register(cookie);

  // Rate Limiting (Proteção contra brute force)
  if (env.NODE_ENV !== 'test') {
    await app.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute'
    });
  }

  // Cabeçalhos de Segurança HTTP e Proteção de Dados Financeiros Sensíveis (Fase 6)
  app.addHook('onSend', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Impede cache de dados financeiros confidenciais por navegadores ou proxies intermediários
    if (request.url.startsWith('/api/v1')) {
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
    }
  });

  // Documentação Swagger / OpenAPI
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'FinControl API',
        description: 'Documentação da API do Sistema de Gestão Financeira Pessoal FinControl',
        version: '1.0.0'
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Ambiente Local'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  });

  // Tratamento Global de Erros (deve ser registrado antes das rotas)
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados de entrada inválidos',
          issues: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    }

    // Se tiver statusCode definido no erro customizado
    const statusCode = (error as any).statusCode || 500;
    const code = (error as any).code || 'INTERNAL_SERVER_ERROR';

    const errorMessage = error instanceof Error ? error.message : 'Erro na requisição';

    if (statusCode < 500) {
      return reply.status(statusCode).send({
        success: false,
        error: {
          code,
          message: errorMessage
        }
      });
    }

    // Log de erro 500
    app.log.error(error);

    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Ocorreu um erro interno no servidor.'
      }
    });
  });

  // Rotas da API
  await app.register(healthRoutes, { prefix: '/api/v1' });
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(accountRoutes, { prefix: '/api/v1/accounts' });
  await app.register(categoryRoutes, { prefix: '/api/v1/categories' });
  await app.register(transactionRoutes, { prefix: '/api/v1/transactions' });
  await app.register(dashboardRoutes, { prefix: '/api/v1/dashboard' });
  await app.register(cardRoutes, { prefix: '/api/v1/cards' });
  await app.register(invoiceRoutes, { prefix: '/api/v1/invoices' });
  await app.register(recurringRoutes, { prefix: '/api/v1/recurring' });
  await app.register(budgetRoutes, { prefix: '/api/v1/budgets' });
  await app.register(goalRoutes, { prefix: '/api/v1/goals' });
  await app.register(reportRoutes, { prefix: '/api/v1/reports' });
  await app.register(integrationRoutes, { prefix: '/api/v1/integrations' });

  // Servir Frontend Estático (Fullstack Unificado - Opção B.1)
  const potentialDistPaths = [
    path.resolve(process.cwd(), '../frontend/dist'),
    path.resolve(process.cwd(), 'frontend/dist'),
    path.resolve(process.cwd(), 'frontend-dist'),
    path.resolve(process.cwd(), 'public'),
    path.resolve(__dirname, '../../../../frontend/dist'),
    path.resolve(__dirname, '../../../frontend/dist')
  ];

  const frontendDist = potentialDistPaths.find((p) => fs.existsSync(path.join(p, 'index.html')));

  if (frontendDist) {
    await app.register(fastifyStatic, {
      root: frontendDist,
      prefix: '/',
      wildcard: false
    });

    // SPA Fallback: Qualquer rota que não seja /api, /docs ou asset estático serve o index.html
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api') || request.url.startsWith('/docs')) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Rota '${request.method} ${request.url}' não encontrada`
          }
        });
      }
      return reply.sendFile('index.html');
    });
  }

  return app;
}
