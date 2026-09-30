import { describe, it, expect } from 'vitest';
import { Money } from './money.js';
import { BalanceCalculator } from './balance.js';

describe('BalanceCalculator Engine', () => {
  it('deve calcular o saldo da conta respeitando receitas, despesas, transferências e pagamentos de fatura', () => {
    const initial = Money.fromString('1.000,00');
    const income = Money.fromString('5.000,00');
    const expense = Money.fromString('1.500,00');
    const transferIn = Money.fromString('300,00');
    const transferOut = Money.fromString('200,00');
    const invoicePayment = Money.fromString('800,00');

    const balance = BalanceCalculator.calculateAccountBalance({
      initialBalance: initial,
      incomes: [income],
      expenses: [expense],
      transfersIn: [transferIn],
      transfersOut: [transferOut],
      invoicePayments: [invoicePayment]
    });

    // 1000 + 5000 - 1500 + 300 - 200 - 800 = 3800,00
    expect(balance.toCents()).toBe(380000n);
    expect(balance.formatBRL()).toBe('R$ 3.800,00');
  });

  it('deve calcular o saldo consolidado a partir das contas de liquidez imediata', () => {
    const nubank = Money.fromString('3.540,00');
    const itau = Money.fromString('7.200,00');
    const carteira = Money.fromString('180,00');

    const consolidated = BalanceCalculator.calculateConsolidatedBalance([nubank, itau, carteira]);
    // 3540 + 7200 + 180 = 10920,00
    expect(consolidated.toCents()).toBe(1092000n);
    expect(consolidated.formatBRL()).toBe('R$ 10.920,00');
  });

  it('deve calcular o patrimônio líquido considerando contas líquidas, investimentos e passivos de fatura', () => {
    const liquid = [Money.fromString('3.540,00'), Money.fromString('7.200,00')]; // 10.740,00
    const investments = [Money.fromString('15.300,00')]; // 15.300,00
    const cardDebts = [Money.fromString('2.660,00')]; // -2.660,00

    const netWorth = BalanceCalculator.calculateNetWorth({
      liquidBalances: liquid,
      investmentBalances: investments,
      unpaidInvoiceDebts: cardDebts
    });

    // 10.740 + 15.300 - 2.660 = 23.380,00
    expect(netWorth.toCents()).toBe(2338000n);
    expect(netWorth.formatBRL()).toBe('R$ 23.380,00');
  });

  it('deve calcular o saldo projetado considerando receitas, despesas e faturas agendadas', () => {
    const current = Money.fromString('2.000,00');
    const scheduledIncome = [Money.fromString('4.000,00')];
    const scheduledExpense = [Money.fromString('1.200,00')];
    const scheduledInvoice = [Money.fromString('1.500,00')];

    const projected = BalanceCalculator.calculateProjectedBalance({
      currentBalance: current,
      scheduledIncomes: scheduledIncome,
      scheduledExpenses: scheduledExpense,
      scheduledInvoices: scheduledInvoice
    });

    // 2000 + 4000 - 1200 - 1500 = 3300,00
    expect(projected.toCents()).toBe(330000n);
    expect(projected.formatBRL()).toBe('R$ 3.300,00');
  });

  it('deve calcular a taxa de poupança (savings rate) corretamente', () => {
    const income = Money.fromString('6.200,00');
    const expense = Money.fromString('4.850,00');

    // Economia: 1.350,00 -> 1350 / 6200 * 100 = 21.77% -> 21.8%
    const rate = BalanceCalculator.calculateSavingsRate(income, expense);
    expect(rate).toBe(21.8);
  });
});
