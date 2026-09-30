import { FastifyReply, FastifyRequest } from 'fastify';
import { TokenService, UserTokenPayload } from '../../infrastructure/security/token.js';
import { UnauthorizedError } from '../errors/app-error.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: UserTokenPayload;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    let token: string | undefined;

    // 1. Tenta obter do header Authorization: Bearer <token>
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // 2. Se não estiver no header, busca no cookie seguro HttpOnly
    if (!token && request.cookies?.access_token) {
      token = request.cookies.access_token;
    }

    if (!token) {
      throw new UnauthorizedError('Token de autenticação não fornecido');
    }

    const payload = TokenService.verifyAccessToken(token);
    request.user = payload;
  } catch (error) {
    throw new UnauthorizedError('Token de autenticação inválido ou expirado');
  }
}
