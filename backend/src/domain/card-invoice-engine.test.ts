import { describe, it, expect } from 'vitest';
import { CardInvoiceEngine } from './card-invoice-engine.js';

describe('CardInvoiceEngine', () => {
  it('deve alocar compra realizada ANTES do fechamento na fatura do mês atual', () => {
    // Fechamento dia 20, Vencimento dia 27
    // Compra no dia 15/09/2026
    const purchaseDate = new Date(2026, 8, 15); // Mês 8 = Setembro (0-indexed)
    const result = CardInvoiceEngine.determineInvoicePeriod(purchaseDate, 20, 27);

    expect(result.month).toBe(9); // Setembro
    expect(result.year).toBe(2026);
    expect(result.closingDate.getDate()).toBe(20);
    expect(result.dueDate.getDate()).toBe(27);
    expect(result.dueDate.getMonth()).toBe(8); // Setembro
  });

  it('deve alocar compra realizada NO DIA do fechamento na fatura do mês seguinte (melhor dia de compra)', () => {
    // Compra exatamente no dia 20/09/2026
    const purchaseDate = new Date(2026, 8, 20);
    const result = CardInvoiceEngine.determineInvoicePeriod(purchaseDate, 20, 27);

    expect(result.month).toBe(10); // Outubro
    expect(result.year).toBe(2026);
    expect(result.closingDate.getMonth()).toBe(9); // Outubro
    expect(result.dueDate.getMonth()).toBe(9); // Outubro
  });

  it('deve calcular vencimento no mês seguinte se dueDay <= closingDay', () => {
    // Fechamento dia 25, Vencimento dia 05
    // Compra dia 10/09/2026 -> fatura fecha 25/09, vence 05/10
    const purchaseDate = new Date(2026, 8, 10);
    const result = CardInvoiceEngine.determineInvoicePeriod(purchaseDate, 25, 5);

    expect(result.month).toBe(9); // Setembro
    expect(result.closingDate.getMonth()).toBe(8); // Setembro
    expect(result.dueDate.getMonth()).toBe(9); // Outubro
    expect(result.dueDate.getDate()).toBe(5);
  });

  it('deve virar o ano corretamente para compras em Dezembro após o fechamento', () => {
    // Compra dia 25/12/2026 com fechamento dia 20
    const purchaseDate = new Date(2026, 11, 25);
    const result = CardInvoiceEngine.determineInvoicePeriod(purchaseDate, 20, 27);

    expect(result.month).toBe(1); // Janeiro
    expect(result.year).toBe(2027); // 2027
  });

  it('deve dividir compras parceladas em centavos exatos sem perder resíduo', () => {
    // R$ 100,00 (10000 centavos) em 3 parcelas
    const installments = CardInvoiceEngine.calculateInstallments(10000n, 3);

    expect(installments).toHaveLength(3);
    expect(installments[0]).toBe(3334n); // Absorve o resto de 1 centavo
    expect(installments[1]).toBe(3333n);
    expect(installments[2]).toBe(3333n);

    const sum = installments.reduce((acc, val) => acc + val, 0n);
    expect(sum).toBe(10000n);
  });

  it('deve dividir perfeitamente parcelas sem resto', () => {
    // R$ 1.200,00 (120000 centavos) em 12 parcelas de R$ 100,00 (10000 centavos)
    const installments = CardInvoiceEngine.calculateInstallments(120000n, 12);

    expect(installments).toHaveLength(12);
    for (const inst of installments) {
      expect(inst).toBe(10000n);
    }

    const sum = installments.reduce((acc, val) => acc + val, 0n);
    expect(sum).toBe(120000n);
  });
});
