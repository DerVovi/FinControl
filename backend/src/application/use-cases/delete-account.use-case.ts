import { prisma } from '../../infrastructure/database/prisma.js';
import { AppError, NotFoundError } from '../../presentation/errors/app-error.js';

export class DeleteAccountUseCase {
  public static async execute(userId: string, accountId: string) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      include: {
        _count: {
          select: {
            transactions: true,
            destinationTransactions: true
          }
        }
      }
    });

    if (!account) {
      throw new NotFoundError('Conta não encontrada');
    }

    const totalTx = account._count.transactions + account._count.destinationTransactions;
    if (totalTx > 0) {
      throw new AppError(
        'Esta conta possui transações vinculadas e não pode ser excluída para preservar o histórico financeiro. Utilize a opção de arquivamento.',
        400,
        'ACCOUNT_HAS_TRANSACTIONS'
      );
    }

    await prisma.account.delete({
      where: { id: accountId }
    });

    return { success: true, message: 'Conta excluída com sucesso.' };
  }
}
