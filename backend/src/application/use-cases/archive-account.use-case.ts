import { prisma } from '../../infrastructure/database/prisma.js';
import { NotFoundError } from '../../presentation/errors/app-error.js';

export class ArchiveAccountUseCase {
  public static async execute(userId: string, accountId: string) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId }
    });

    if (!account) {
      throw new NotFoundError('Conta não encontrada');
    }

    const newStatus = account.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';

    const updated = await prisma.account.update({
      where: { id: accountId },
      data: { status: newStatus }
    });

    return {
      ...updated,
      initialBalanceCents: updated.initialBalanceCents.toString(),
      currentBalanceCents: updated.currentBalanceCents.toString()
    };
  }
}
