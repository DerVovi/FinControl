import { describe, it, expect } from 'vitest';
import { Money } from './money.js';

describe('Money Value Object', () => {
  it('deve instanciar a partir de centavos inteiros (fromCents)', () => {
    const m = Money.fromCents(1050n);
    expect(m.toCents()).toBe(1050n);
    expect(m.formatBRL()).toBe('R$ 10,50');
  });

  it('deve converter string brasileira "10,50" para 1050 centavos', () => {
    const m = Money.fromString('10,50');
    expect(m.toCents()).toBe(1050n);
    expect(m.formatBRL()).toBe('R$ 10,50');
  });

  it('deve converter string com milhar "1.250,75" para 125075 centavos', () => {
    const m = Money.fromString('R$ 1.250,75');
    expect(m.toCents()).toBe(125075n);
    expect(m.formatBRL()).toBe('R$ 1.250,75');
  });

  it('deve somar valores com precisão absoluta sem erro de ponto flutuante', () => {
    // Caso clássico do IEEE 754 onde 0.1 + 0.2 != 0.3
    const m1 = Money.fromString('0,10');
    const m2 = Money.fromString('0,20');
    const sum = m1.add(m2);

    expect(sum.toCents()).toBe(30n);
    expect(sum.formatBRL()).toBe('R$ 0,30');
  });

  it('deve subtrair valores corretamente e suportar saldos negativos', () => {
    const account = Money.fromString('100,00');
    const expense = Money.fromString('150,50');
    const remaining = account.subtract(expense);

    expect(remaining.toCents()).toBe(-5050n);
    expect(remaining.isNegative()).toBe(true);
    expect(remaining.formatBRL()).toBe('-R$ 50,50');
  });

  it('deve multiplicar por número inteiro determinístico', () => {
    const installment = Money.fromString('35,00');
    const total = installment.multiply(12);

    expect(total.toCents()).toBe(42000n);
    expect(total.formatBRL()).toBe('R$ 420,00');
  });

  it('deve calcular porcentagem com precisão bancária', () => {
    const base = Money.fromString('1.000,00');
    const alert80 = base.percentage(80);
    const savings21_7 = base.percentage(21.7);

    expect(alert80.formatBRL()).toBe('R$ 800,00');
    expect(savings21_7.formatBRL()).toBe('R$ 217,00');
  });

  it('deve rejeitar operações entre moedas distintas', () => {
    const brl = Money.fromCents(1000n, 'BRL');
    const usd = Money.fromCents(1000n, 'USD');

    expect(() => brl.add(usd)).toThrow('Moedas incompatíveis');
  });

  it('deve realizar comparações ordinais corretamente', () => {
    const m1 = Money.fromString('100,00');
    const m2 = Money.fromString('200,00');

    expect(m1.lessThan(m2)).toBe(true);
    expect(m2.greaterThan(m1)).toBe(true);
    expect(m1.equals(Money.fromString('100,00'))).toBe(true);
  });
});
