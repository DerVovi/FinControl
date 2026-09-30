import { prisma } from '../../infrastructure/database/prisma.js';
import { PasswordHasher } from '../../infrastructure/security/password.js';
import { TokenService } from '../../infrastructure/security/token.js';
import { UnauthorizedError } from '../../presentation/errors/app-error.js';
import { AuthOutput } from './register-user.use-case.js';

export interface LoginUserInput {
  email: string;
  password: string;
}

export class LoginUserUseCase {
  public static async execute(input: LoginUserInput): Promise<AuthOutput> {
    const emailNormalized = input.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: emailNormalized }
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

    const passwordMatch = await PasswordHasher.compare(input.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

    const accessToken = TokenService.generateAccessToken({
      sub: user.id,
      email: user.email
    });

    const { token: rawRefreshToken, hash: refreshHash } = TokenService.generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        expiresAt
      }
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        baseCurrency: user.baseCurrency,
        createdAt: user.createdAt
      },
      accessToken,
      refreshToken: rawRefreshToken
    };
  }
}
