import { describe, it, expect } from 'vitest';
import { RecurringEngine } from './recurring-engine.js';

describe('RecurringEngine', () => {
  it('deve calcular ocorrências diárias dentro do horizonte de dias', () => {
    const start = new Date();
    const dates = RecurringEngine.calculateNextDates({
      startDate: start,
      frequency: 'DAILY',
      horizonDays: 5
    });

    expect(dates.length).toBeGreaterThanOrEqual(5);
  });

  it('deve calcular ocorrências mensais respeitando o dia do mês fixo', () => {
    const start = new Date();
    const dates = RecurringEngine.calculateNextDates({
      startDate: start,
      frequency: 'MONTHLY',
      dayOfMonth: 15,
      horizonDays: 60
    });

    expect(dates.length).toBeGreaterThanOrEqual(1);
    for (const d of dates) {
      expect(d.getDate()).toBe(15);
    }
  });

  it('deve respeitar a data limite (endDate) se configurada', () => {
    const start = new Date();
    const end = new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 dias

    const dates = RecurringEngine.calculateNextDates({
      startDate: start,
      frequency: 'DAILY',
      horizonDays: 30,
      endDate: end
    });

    expect(dates.length).toBeLessThanOrEqual(3);
  });
});
