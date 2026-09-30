import { prisma } from '../../infrastructure/database/prisma.js';

export interface ListTransactionsFilter {
  userId: string;
  accountId?: string;
  categoryId?: string;
  type?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class ListTransactionsUseCase {
  public static async execute(filter: ListTransactionsFilter) {
    const where: any = { userId: filter.userId };

    if (filter.accountId) {
      where.OR = [{ accountId: filter.accountId }, { destinationAccountId: filter.accountId }];
    }
    if (filter.categoryId) {
      where.categoryId = filter.categoryId;
    }
    if (filter.type) {
      where.type = filter.type;
    }
    if (filter.startDate || filter.endDate) {
      where.date = {};
      if (filter.startDate) where.date.gte = filter.startDate;
      if (filter.endDate) where.date.lte = filter.endDate;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        take: filter.limit || 50,
        skip: filter.offset || 0,
        include: {
          account: { select: { id: true, name: true, color: true } },
          destinationAccount: { select: { id: true, name: true, color: true } },
          category: { select: { id: true, name: true, color: true, icon: true } }
        }
      }),
      prisma.transaction.count({ where })
    ]);

    return {
      data: transactions.map((tx) => ({
        ...tx,
        amountCents: tx.amountCents.toString()
      })),
      total,
      limit: filter.limit || 50,
      offset: filter.offset || 0
    };
  }
}
