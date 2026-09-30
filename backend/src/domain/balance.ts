import { Money } from './money.js';

/**
 * Motor puro de cálculo contábil e consolidação de saldos do FinControl.
 * Todas as regras seguem rigorosamente a especificação do produto.
 */
export class BalanceCalculator {
  /**
   * 1. Saldo da Conta:
   * Saldo Inicial + Σ(Receitas) - Σ(Despesas) + Σ(Transferências Recebidas) - Σ(Transferências Enviadas) - Σ(Pagamentos de Fatura)
   */
  public static calculateAccountBalance(params: {
    initialBalance: Money;
    incomes?: Money[];
    expenses?: Money[];
    transfersIn?: Money[];
    transfersOut?: Money[];
    invoicePayments?: Money[];
  }): Money {
    let balance = params.initialBalance;

    if (params.incomes) {
      for (const inc of params.incomes) balance = balance.add(inc);
    }
    if (params.expenses) {
      for (const exp of params.expenses) balance = balance.subtract(exp);
    }
    if (params.transfersIn) {
      for (const tIn of params.transfersIn) balance = balance.add(tIn);
    }
    if (params.transfersOut) {
      for (const tOut of params.transfersOut) balance = balance.subtract(tOut);
    }
    if (params.invoicePayments) {
      for (const invPay of params.invoicePayments) balance = balance.subtract(invPay);
    }

    return balance;
  }

  /**
   * 2. Saldo Consolidado:
   * Soma dos saldos disponíveis das contas ativas de liquidez imediata (Corrente, Poupança, Digital, Carteira).
   */
  public static calculateConsolidatedBalance(liquidAccountBalances: Money[]): Money {
    let total = Money.zero();
    for (const b of liquidAccountBalances) {
      total = total.add(b);
    }
    return total;
  }

  /**
   * 3. Patrimônio Líquido:
   * Saldo Consolidado + Ativos de Investimento - Passivos (faturas de cartão em aberto/a vencer).
   */
  public static calculateNetWorth(params: {
    liquidBalances: Money[];
    investmentBalances: Money[];
    unpaidInvoiceDebts: Money[];
  }): Money {
    let netWorth = this.calculateConsolidatedBalance(params.liquidBalances);

    for (const inv of params.investmentBalances) {
      netWorth = netWorth.add(inv);
    }
    for (const debt of params.unpaidInvoiceDebts) {
      netWorth = netWorth.subtract(debt);
    }

    return netWorth;
  }

  /**
   * 4. Saldo Projetado para uma data futura:
   * Saldo Atual + Receitas Agendadas Confirmadas - Despesas Agendadas - Faturas Agendadas.
   */
  public static calculateProjectedBalance(params: {
    currentBalance: Money;
    scheduledIncomes: Money[];
    scheduledExpenses: Money[];
    scheduledInvoices: Money[];
  }): Money {
    let projected = params.currentBalance;

    for (const inc of params.scheduledIncomes) projected = projected.add(inc);
    for (const exp of params.scheduledExpenses) projected = projected.subtract(exp);
    for (const inv of params.scheduledInvoices) projected = projected.subtract(inv);

    return projected;
  }

  /**
   * 5. Taxa de Economia (Savings Rate):
   * (Receitas - Despesas) / Receitas * 100
   * Retorna valor com 1 casa decimal (ex: 21.7 para 21,7%).
   */
  public static calculateSavingsRate(totalIncome: Money, totalExpense: Money): number {
    if (totalIncome.isZero() || totalIncome.isNegative()) {
      return 0.0;
    }

    const netSavings = totalIncome.subtract(totalExpense);
    if (netSavings.isNegative()) {
      const negativeRate = (Number(netSavings.toCents()) / Number(totalIncome.toCents())) * 100;
      return Math.round(negativeRate * 10) / 10;
    }

    const rate = (Number(netSavings.toCents()) / Number(totalIncome.toCents())) * 100;
    return Math.round(rate * 10) / 10;
  }
}
