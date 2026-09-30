import { prisma } from '../../infrastructure/database/prisma.js';
import { NotFoundError } from '../../presentation/errors/app-error.js';

export class GetMeUseCase {
  public static async execute(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        baseCurrency: true,
        createdAt: true,
        _count: {
          select: {
            accounts: true,
            categories: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    return user;
  }
}
