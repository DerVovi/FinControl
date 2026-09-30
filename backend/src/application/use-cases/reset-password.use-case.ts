import { prisma } from '../../infrastructure/database/prisma.js';
import { PasswordHasher } from '../../infrastructure/security/password.js';
import { TokenService } from '../../infrastructure/security/token.js';
import { AppError, UnauthorizedError } from '../../presentation/errors/app-error.js';

export class ResetPasswordUseCase {
  public static async execute(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    if (newPassword.length < 8) {
      throw new AppError('A nova senha deve ter no mínimo 8 caracteres');
    }

    const tokenHash = TokenService.hashToken(token);

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash }
    });

    if (!resetRecord || resetRecord.used || resetRecord.expiresAt < new Date()) {
      throw new UnauthorizedError('Token de recuperação inválido ou expirado');
    }

    const newPasswordHash = await PasswordHasher.hash(newPassword);

    await prisma.$transaction(async (tx) => {
      // 1. Atualiza a senha
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newPasswordHash }
      });

      // 2. Marca o token como utilizado
      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { used: true }
      });

      // 3. Revoga todos os refresh tokens anteriores por segurança
      await tx.refreshToken.updateMany({
        where: { userId: resetRecord.userId },
        data: { revoked: true }
      });
    });

    return { success: true, message: 'Senha alterada com sucesso.' };
  }
}
