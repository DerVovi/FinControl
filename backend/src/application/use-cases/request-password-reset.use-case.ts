import { prisma } from '../../infrastructure/database/prisma.js';
import { TokenService } from '../../infrastructure/security/token.js';

export class RequestPasswordResetUseCase {
  public static async execute(email: string): Promise<{ message: string; debugResetToken?: string }> {
    const emailNormalized = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: emailNormalized }
    });

    // Por segurança, não confirmamos a terceiros se o e-mail existe
    if (!user || user.deletedAt) {
      return { message: 'Se o e-mail estiver cadastrado, um link de recuperação foi gerado.' };
    }

    const { token: rawToken, hash: tokenHash } = TokenService.generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hora de validade

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    // Em ambiente de desenvolvimento, retornamos o token para testes ágeis sem SMTP externo
    return {
      message: 'Se o e-mail estiver cadastrado, um link de recuperação foi gerado.',
      debugResetToken: process.env.NODE_ENV !== 'production' ? rawToken : undefined
    };
  }
}
