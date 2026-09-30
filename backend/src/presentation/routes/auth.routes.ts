import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case.js';
import { LoginUserUseCase } from '../../application/use-cases/login-user.use-case.js';
import { GetMeUseCase } from '../../application/use-cases/get-me.use-case.js';
import { RequestPasswordResetUseCase } from '../../application/use-cases/request-password-reset.use-case.js';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case.js';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/v1/auth/register
  fastify.post(
    '/register',
    {
      schema: {
        description: 'Cadastra um novo usuário no FinControl com categorias iniciais',
        tags: ['Autenticação'],
        body: {
          type: 'object',
          required: ['fullName', 'email', 'password'],
          properties: {
            fullName: { type: 'string', minLength: 2 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      fullName: { type: 'string' },
                      baseCurrency: { type: 'string' },
                      createdAt: { type: 'string' }
                    }
                  },
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const registerSchema = z.object({
        fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
        email: z.string().email('E-mail inválido'),
        password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres')
      });

      const body = registerSchema.parse(request.body);
      const result = await RegisterUserUseCase.execute(body);

      // Define cookies HttpOnly seguros
      reply.setCookie('access_token', result.accessToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 // 15 minutos
      });

      reply.setCookie('refresh_token', result.refreshToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 // 7 dias
      });

      return reply.status(201).send({
        success: true,
        data: result
      });
    }
  );

  // POST /api/v1/auth/login
  fastify.post(
    '/login',
    {
      schema: {
        description: 'Autentica o usuário e emite credenciais de sessão',
        tags: ['Autenticação'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const loginSchema = z.object({
        email: z.string().email('E-mail inválido'),
        password: z.string().min(1, 'Senha é obrigatória')
      });

      const body = loginSchema.parse(request.body);
      const result = await LoginUserUseCase.execute(body);

      reply.setCookie('access_token', result.accessToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60
      });

      reply.setCookie('refresh_token', result.refreshToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60
      });

      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // POST /api/v1/auth/logout
  fastify.post(
    '/logout',
    {
      schema: {
        description: 'Encerra a sessão do usuário e limpa cookies',
        tags: ['Autenticação']
      }
    },
    async (request, reply) => {
      reply.clearCookie('access_token', { path: '/' });
      reply.clearCookie('refresh_token', { path: '/' });

      return reply.send({
        success: true,
        message: 'Logout realizado com sucesso.'
      });
    }
  );

  // POST /api/v1/auth/refresh
  fastify.post(
    '/refresh',
    {
      schema: {
        description: 'Renova a sessão e emite novo access token a partir do refresh token',
        tags: ['Autenticação']
      }
    },
    async (request, reply) => {
      const cookieRefreshToken = request.cookies?.refresh_token;
      const bodyRefreshToken = (request.body as any)?.refreshToken;
      const rawRefreshToken = cookieRefreshToken || bodyRefreshToken;

      const result = await RefreshTokenUseCase.execute(rawRefreshToken);

      reply.setCookie('access_token', result.accessToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 // 7 dias
      });

      reply.setCookie('refresh_token', result.refreshToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 // 7 dias
      });

      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // GET /api/v1/auth/me (Protegido)
  fastify.get(
    '/me',
    {
      preHandler: [authMiddleware],
      schema: {
        description: 'Retorna os dados do perfil do usuário autenticado',
        tags: ['Autenticação']
      }
    },
    async (request, reply) => {
      const userId = request.user!.sub;
      const user = await GetMeUseCase.execute(userId);

      return reply.send({
        success: true,
        data: user
      });
    }
  );

  // POST /api/v1/auth/forgot-password
  fastify.post(
    '/forgot-password',
    {
      schema: {
        description: 'Solicita recuperação de senha',
        tags: ['Autenticação'],
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' }
          }
        }
      }
    },
    async (request, reply) => {
      const schema = z.object({
        email: z.string().email()
      });
      const { email } = schema.parse(request.body);
      const result = await RequestPasswordResetUseCase.execute(email);

      return reply.send({
        success: true,
        ...result
      });
    }
  );

  // POST /api/v1/auth/reset-password
  fastify.post(
    '/reset-password',
    {
      schema: {
        description: 'Redefine a senha do usuário com base no token de recuperação',
        tags: ['Autenticação'],
        body: {
          type: 'object',
          required: ['token', 'newPassword'],
          properties: {
            token: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 }
          }
        }
      }
    },
    async (request, reply) => {
      const schema = z.object({
        token: z.string().min(1, 'Token é obrigatório'),
        newPassword: z.string().min(8, 'Nova senha deve ter no mínimo 8 caracteres')
      });
      const { token, newPassword } = schema.parse(request.body);
      const result = await ResetPasswordUseCase.execute(token, newPassword);

      return reply.send({
        success: true,
        message: result.message
      });
    }
  );
}
