/**
 * Motor puro de geração e projeção de transações recorrentes.
 * Implementa a estratégia híbrida de materialização com janela móvel.
 */
export class RecurringEngine {
  /**
   * Calcula as próximas datas de ocorrência dentro de uma janela móvel (horizonDays).
   */
  public static calculateNextDates(params: {
    startDate: Date;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    dayOfMonth?: number | null;
    horizonDays: number;
    endDate?: Date | null;
  }): Date[] {
    const dates: Date[] = [];
    const now = new Date();
    // Limite máximo da janela móvel
    const horizonLimit = new Date(now.getTime() + params.horizonDays * 24 * 60 * 60 * 1000);
    const effectiveLimit = params.endDate && params.endDate < horizonLimit ? params.endDate : horizonLimit;

    let cursor = new Date(params.startDate);

    // Se for mensal com dia fixo do mês, alinha o cursor inicial para o dia alvo
    if (params.frequency === 'MONTHLY' && params.dayOfMonth) {
      const targetDay = params.dayOfMonth;
      if (cursor.getDate() > targetDay) {
        // Se a data inicial já passou do dia alvo no mês corrente, avança para o próximo mês
        cursor.setMonth(cursor.getMonth() + 1);
      }
      const maxDays = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
      cursor.setDate(Math.min(targetDay, maxDays));
    }

    // Avança o cursor gerando as ocorrências na janela
    while (cursor <= effectiveLimit) {
      if (cursor >= now || cursor.toDateString() === now.toDateString()) {
        dates.push(new Date(cursor));
      }

      // Incrementa conforme a frequência
      switch (params.frequency) {
        case 'DAILY':
          cursor.setDate(cursor.getDate() + 1);
          break;
        case 'WEEKLY':
          cursor.setDate(cursor.getDate() + 7);
          break;
        case 'MONTHLY': {
          const targetDay = params.dayOfMonth || params.startDate.getDate();
          const nextMonth = cursor.getMonth() + 1;
          const nextYear = cursor.getFullYear() + (nextMonth > 11 ? 1 : 0);
          const normalizedMonth = nextMonth % 12;
          const maxDays = new Date(nextYear, normalizedMonth + 1, 0).getDate();
          cursor = new Date(nextYear, normalizedMonth, Math.min(targetDay, maxDays));
          break;
        }
        case 'YEARLY':
          cursor.setFullYear(cursor.getFullYear() + 1);
          break;
      }
    }

    return dates;
  }
}
