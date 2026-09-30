import { prisma } from '../../infrastructure/database/prisma.js';
import { Money } from '../../domain/money.js';

export class ListRecurringUseCase {
  public static async execute(userId: string) {
    const list = await prisma.recurringTransaction.findMany({
      where: { userId },
      include: {
        account: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, color: true, icon: true } },
        _count: { select: { transactions: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return list.map((item) => ({
      ...item,
      amountCents: item.amountCents.toString(),
      formattedAmount: Money.fromCents(item.amountCents).formatBRL()
    }));
  }
}
