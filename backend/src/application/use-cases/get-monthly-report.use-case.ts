import { prisma } from '../../infrastructure/database/prisma.js';
import { Money } from '../../domain/money.js';
import { BalanceCalculator } from '../../domain/balance.js';

export class GetMonthlyReportUseCase {
  public static async execute(userId: string, year: number, month: number) {
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // 1. Receitas do mês selecionado (apenas INCOME)
    const incomeTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'INCOME',
        status: 'CONFIRMED',
        date: { gte: startOfMonth, lte: endOfMonth }
      },
      select: { amountCents: true }
    });

    let totalIncomeCents = 0n;
    for (const inc of incomeTransactions) {
      totalIncomeCents += inc.amountCents;
    }

    // 2. Despesas do mês selecionado (apenas EXPENSE - sem transferências nem faturas duplicadas)
    const expenseTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        status: 'CONFIRMED',
        date: { gte: startOfMonth, lte: endOfMonth }
      },
      select: { id: true, description: true, amountCents: true, date: true, categoryId: true }
    });

    let totalExpenseCents = 0n;
    const categoryTotals = new Map<string, { totalCents: bigint; count: number }>();

    for (const exp of expenseTransactions) {
      totalExpenseCents += exp.amountCents;
      const catKey = exp.categoryId || 'SEM_CATEGORIA';
      const existing = categoryTotals.get(catKey) || { totalCents: 0n, count: 0 };
      categoryTotals.set(catKey, {
        totalCents: existing.totalCents + exp.amountCents,
        count: existing.count + 1
      });
    }

    const incomeMoney = Money.fromCents(totalIncomeCents);
    const expenseMoney = Money.fromCents(totalExpenseCents);
    const netSavingsMoney = incomeMoney.subtract(expenseMoney);
    const savingsRate = BalanceCalculator.calculateSavingsRate(incomeMoney, expenseMoney);

    // Categorias para enriquecer
    const categories = await prisma.category.findMany({
      where: {
        OR: [{ userId }, { isSystem: true }]
      }
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const categoryBreakdown = Array.from(categoryTotals.entries())
      .map(([catId, data]) => {
        const cat = categoryMap.get(catId);
        const amountNumber = Number(data.totalCents);
        const totalNumber = Number(totalExpenseCents) || 1;
        const percentage = Math.round((amountNumber / totalNumber) * 1000) / 10;

        return {
          id: catId,
          name: cat ? cat.name : 'Outras',
          color: cat?.color || '#9CA3AF',
          icon: cat?.icon || 'tag',
          amountCents: data.totalCents.toString(),
          formattedAmount: Money.fromCents(data.totalCents).formatBRL(),
          percentage,
          transactionCount: data.count
        };
      })
      .sort((a, b) => Number(b.amountCents) - Number(a.amountCents));

    // 3. Evolução dos últimos 6 meses (DRE Histórico)
    const evolution: Array<{
      month: number;
      year: number;
      label: string;
      incomeCents: string;
      formattedIncome: string;
      expenseCents: string;
      formattedExpense: string;
      netCents: string;
      formattedNet: string;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const mYear = d.getFullYear();
      const mMonth = d.getMonth() + 1;
      const mStart = new Date(mYear, mMonth - 1, 1, 0, 0, 0, 0);
      const mEnd = new Date(mYear, mMonth, 0, 23, 59, 59, 999);

      const [mIncomes, mExpenses] = await Promise.all([
        prisma.transaction.findMany({
          where: {
            userId,
            type: 'INCOME',
            status: 'CONFIRMED',
            date: { gte: mStart, lte: mEnd }
          },
          select: { amountCents: true }
        }),
        prisma.transaction.findMany({
          where: {
            userId,
            type: 'EXPENSE',
            status: 'CONFIRMED',
            date: { gte: mStart, lte: mEnd }
          },
          select: { amountCents: true }
        })
      ]);

      let mInc = 0n;
      for (const t of mIncomes) mInc += t.amountCents;

      let mExp = 0n;
      for (const t of mExpenses) mExp += t.amountCents;

      const incM = Money.fromCents(mInc);
      const expM = Money.fromCents(mExp);
      const netM = incM.subtract(expM);

      const label = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });

      evolution.push({
        month: mMonth,
        year: mYear,
        label,
        incomeCents: mInc.toString(),
        formattedIncome: incM.formatBRL(),
        expenseCents: mExp.toString(),
        formattedExpense: expM.formatBRL(),
        netCents: netM.toCents().toString(),
        formattedNet: netM.formatBRL()
      });
    }

    return {
      period: {
        year,
        month,
        startDate: startOfMonth,
        endDate: endOfMonth
      },
      summary: {
        incomeCents: incomeMoney.toCents().toString(),
        formattedIncome: incomeMoney.formatBRL(),
        expenseCents: expenseMoney.toCents().toString(),
        formattedExpense: expenseMoney.formatBRL(),
        netSavingsCents: netSavingsMoney.toCents().toString(),
        formattedNetSavings: netSavingsMoney.formatBRL(),
        savingsRate
      },
      categoryBreakdown,
      evolution
    };
  }
}
