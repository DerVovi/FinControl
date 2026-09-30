import { prisma } from '../../infrastructure/database/prisma.js';

export class ListAccountsUseCase {
  public static async execute(userId: string, status?: string) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const accounts = await prisma.account.findMany({
      where,
      orderBy: { createdAt: 'asc' }
    });

    return accounts.map((acc) => ({
      ...acc,
      initialBalanceCents: acc.initialBalanceCents.toString(),
      currentBalanceCents: acc.currentBalanceCents.toString()
    }));
  }
}
