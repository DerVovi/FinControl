import { prisma } from '../../infrastructure/database/prisma.js';
import { Money } from '../../domain/money.js';

export class ListGoalsUseCase {
  public static async execute(userId: string) {
    const goals = await prisma.goal.findMany({
      where: { userId },
      include: {
        contributions: {
          orderBy: { date: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();

    return goals.map((g) => {
      const targetMoney = Money.fromCents(g.targetAmountCents);
      const currentMoney = Money.fromCents(g.currentAmountCents);
      const remainingMoney = targetMoney.subtract(currentMoney);

      const targetNum = Number(g.targetAmountCents) || 1;
      const currentNum = Number(g.currentAmountCents);
      const percentage = Math.min(100, Math.round((currentNum / targetNum) * 1000) / 10);

      // Calcula aporte mensal planejado se houver targetDate futura
      let suggestedMonthlyContribution: string | null = null;
      if (g.targetDate && g.targetDate > now && remainingMoney.isPositive()) {
        const monthsDiff =
          (g.targetDate.getFullYear() - now.getFullYear()) * 12 +
          (g.targetDate.getMonth() - now.getMonth());
        const months = Math.max(1, monthsDiff);
        const monthlyCents = remainingMoney.toCents() / BigInt(months);
        suggestedMonthlyContribution = Money.fromCents(monthlyCents).formatBRL();
      }

      return {
        id: g.id,
        name: g.name,
        targetAmountCents: g.targetAmountCents.toString(),
        formattedTarget: targetMoney.formatBRL(),
        currentAmountCents: g.currentAmountCents.toString(),
        formattedCurrent: currentMoney.formatBRL(),
        remainingCents: remainingMoney.toCents().toString(),
        formattedRemaining: (remainingMoney.isNegative() ? Money.zero() : remainingMoney).formatBRL(),
        percentage,
        suggestedMonthlyContribution,
        targetDate: g.targetDate,
        color: g.color,
        status: g.status,
        recentContributions: g.contributions.map((c) => ({
          id: c.id,
          amountCents: c.amountCents.toString(),
          formattedAmount: Money.fromCents(c.amountCents).formatBRL(),
          date: c.date,
          notes: c.notes
        }))
      };
    });
  }
}
