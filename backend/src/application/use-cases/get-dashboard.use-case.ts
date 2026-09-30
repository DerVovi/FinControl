import { prisma } from '../../infrastructure/database/prisma.js';
import { Money } from '../../domain/money.js';
import { BalanceCalculator } from '../../domain/balance.js';

export class GetDashboardUseCase {
  public static async execute(userId: string, date: Date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // 1. Busca todas as contas ativas do usuário
    const accounts = await prisma.account.findMany({
      where: { userId, status: 'ACTIVE' }
    });

    let liquidCents = 0n;
    let investmentCents = 0n;

    for (const acc of accounts) {
      if (acc.type === 'INVESTMENT') {
        investmentCents += acc.currentBalanceCents;
      } else {
        liquidCents += acc.currentBalanceCents;
      }
    }

    const consolidatedBalance = Money.fromCents(liquidCents);
    const netWorth = Money.fromCents(liquidCents + investmentCents);

    // 2. Busca transações do mês com filtro estrito de tipo para NÃO DUPLICAR despesas
    // RECEITAS DO MÊS: Apenas type = INCOME (exclui transferências e outros)
    const incomeTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'INCOME',
        status: 'CONFIRMED',
        date: { gte: startOfMonth, lte: endOfMonth }
      },
      select: { amountCents: true }
    });

    // DESPESAS DO MÊS: Apenas type = EXPENSE (exclui estritamente TRANSFER e INVOICE_PAYMENT)
    // Isso garante que transferências entre contas e pagamentos de fatura NUNCA dupliquem a despesa!
    const expenseTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        status: 'CONFIRMED',
        date: { gte: startOfMonth, lte: endOfMonth }
      },
      select: { amountCents: true, categoryId: true }
    });

    let totalIncomeCents = 0n;
    for (const inc of incomeTransactions) {
      totalIncomeCents += inc.amountCents;
    }

    let totalExpenseCents = 0n;
    const categoryTotals = new Map<string, bigint>();

    for (const exp of expenseTransactions) {
      totalExpenseCents += exp.amountCents;
      const catKey = exp.categoryId || 'SEM_CATEGORIA';
      categoryTotals.set(catKey, (categoryTotals.get(catKey) || 0n) + exp.amountCents);
    }

    const totalIncomeMoney = Money.fromCents(totalIncomeCents);
    const totalExpenseMoney = Money.fromCents(totalExpenseCents);
    const savingsRate = BalanceCalculator.calculateSavingsRate(totalIncomeMoney, totalExpenseMoney);

    // 3. Distribuição por Categoria
    const categories = await prisma.category.findMany({
      where: {
        OR: [{ userId }, { isSystem: true }]
      }
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const categoryBreakdown = Array.from(categoryTotals.entries())
      .map(([catId, amount]) => {
        const cat = categoryMap.get(catId);
        const amountNumber = Number(amount);
        const totalNumber = Number(totalExpenseCents) || 1;
        const percentage = Math.round((amountNumber / totalNumber) * 1000) / 10;

        return {
          id: catId,
          name: cat ? cat.name : 'Outras',
          color: cat?.color || '#9CA3AF',
          icon: cat?.icon || 'tag',
          amountCents: amount.toString(),
          formattedAmount: Money.fromCents(amount).formatBRL(),
          percentage
        };
      })
      .sort((a, b) => Number(b.amountCents) - Number(a.amountCents));

    // 4. Últimas 10 transações
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 10,
      include: {
        account: { select: { id: true, name: true, color: true } },
        destinationAccount: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, color: true, icon: true } }
      }
    });

    return {
      period: {
        year,
        month: month + 1,
        startDate: startOfMonth,
        endDate: endOfMonth
      },
      summary: {
        consolidatedBalanceCents: consolidatedBalance.toCents().toString(),
        formattedConsolidatedBalance: consolidatedBalance.formatBRL(),
        netWorthCents: netWorth.toCents().toString(),
        formattedNetWorth: netWorth.formatBRL(),
        monthIncomeCents: totalIncomeMoney.toCents().toString(),
        formattedMonthIncome: totalIncomeMoney.formatBRL(),
        monthExpenseCents: totalExpenseMoney.toCents().toString(),
        formattedMonthExpense: totalExpenseMoney.formatBRL(),
        monthNetCents: totalIncomeMoney.subtract(totalExpenseMoney).toCents().toString(),
        formattedMonthNet: totalIncomeMoney.subtract(totalExpenseMoney).formatBRL(),
        savingsRate
      },
      categoryBreakdown,
      accounts: accounts.map((acc) => ({
        ...acc,
        initialBalanceCents: acc.initialBalanceCents.toString(),
        currentBalanceCents: acc.currentBalanceCents.toString(),
        formattedCurrentBalance: Money.fromCents(acc.currentBalanceCents).formatBRL()
      })),
      recentTransactions: recentTransactions.map((tx) => ({
        ...tx,
        amountCents: tx.amountCents.toString(),
        formattedAmount: Money.fromCents(tx.amountCents).formatBRL()
      }))
    };
  }
}
