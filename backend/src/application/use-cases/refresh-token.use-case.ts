import { prisma } from '../../infrastructure/database/prisma.js';
import { TokenService } from '../../infrastructure/security/token.js';
import { UnauthorizedError } from '../../presentation/errors/app-error.js';

export class RefreshTokenUseCase {
  public static async execute(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Sessão expirada. Faça login novamente.');
    }

    const tokenHash = TokenService.hashToken(rawRefreshToken);
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Sessão expirada. Faça login novamente.');
    }

    // Rotaciona o refresh token para segurança: revoga o anterior
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true }
    });

    // Emite novo refresh token válido por mais 7 dias
    const { token: newRawRefreshToken, hash: newHash } = TokenService.generateRefreshToken();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId: storedToken.userId,
        tokenHash: newHash,
        expiresAt: newExpiresAt
      }
    });

    // Emite novo access token
    const newAccessToken = TokenService.generateAccessToken({
      sub: storedToken.user.id,
      email: storedToken.user.email
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      user: {
        id: storedToken.user.id,
        email: storedToken.user.email,
        fullName: storedToken.user.fullName,
        baseCurrency: storedToken.user.baseCurrency,
        createdAt: storedToken.user.createdAt
      }
    };
  }
}
