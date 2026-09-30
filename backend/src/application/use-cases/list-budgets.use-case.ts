import { prisma } from '../../infrastructure/database/prisma.js';
import { Money } from '../../domain/money.js';

export class ListBudgetsUseCase {
  public static async execute(userId: string, month: number, year: number) {
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const budgets = await prisma.budget.findMany({
      where: { userId, month, year },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } }
      }
    });

    // Busca despesas confirmadas do mês para cada categoria
    const categoryIds = budgets.map((b) => b.categoryId);
    const expenses = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        status: 'CONFIRMED',
        categoryId: { in: categoryIds },
        date: { gte: startOfMonth, lte: endOfMonth }
      },
      select: { categoryId: true, amountCents: true }
    });

    const spentMap = new Map<string, bigint>();
    for (const exp of expenses) {
      if (exp.categoryId) {
        spentMap.set(exp.categoryId, (spentMap.get(exp.categoryId) || 0n) + exp.amountCents);
      }
    }

    return budgets.map((b) => {
      const budgetAmount = Money.fromCents(b.amountCents);
      const spentCents = spentMap.get(b.categoryId) || 0n;
      const spentMoney = Money.fromCents(spentCents);
      const remainingMoney = budgetAmount.subtract(spentMoney);

      const amountNumber = Number(b.amountCents) || 1;
      const spentNumber = Number(spentCents);
      const percentage = Math.round((spentNumber / amountNumber) * 1000) / 10;

      let status = 'OK';
      if (percentage > 100) {
        status = 'EXCEEDED';
      } else if (percentage === 100) {
        status = 'REACHED';
      } else if (percentage >= b.alertThresholdPct) {
        status = 'WARNING';
      }

      return {
        id: b.id,
        categoryId: b.categoryId,
        category: b.category,
        month: b.month,
        year: b.year,
        limitCents: b.amountCents.toString(),
        formattedLimit: budgetAmount.formatBRL(),
        spentCents: spentCents.toString(),
        formattedSpent: spentMoney.formatBRL(),
        remainingCents: remainingMoney.toCents().toString(),
        formattedRemaining: remainingMoney.formatBRL(),
        percentage,
        alertThresholdPct: b.alertThresholdPct,
        status
      };
    });
  }
}
