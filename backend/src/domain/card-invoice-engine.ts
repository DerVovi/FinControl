/**
 * Motor puro de regras de cartões de crédito, ciclo de faturas e compras parceladas.
 * Regras 100% determinísticas sem dependência de banco de dados.
 */
export class CardInvoiceEngine {
  /**
   * Determina a qual fatura (mês/ano de competência de fechamento) uma compra pertence.
   * Regra:
   * - Se o dia da compra for ANTES do dia de fechamento (purchaseDate.getDate() < closingDay):
   *   A compra entra na fatura que fecha no mês corrente.
   * - Se o dia da compra for NO DIA ou DEPOIS do fechamento (purchaseDate.getDate() >= closingDay):
   *   A compra entra na fatura que fecha no mês seguinte ("melhor dia de compra").
   */
  public static determineInvoicePeriod(
    purchaseDate: Date,
    closingDay: number,
    dueDay: number
  ): {
    month: number;
    year: number;
    closingDate: Date;
    dueDate: Date;
  } {
    const purchaseDay = purchaseDate.getDate();
    let targetMonth = purchaseDate.getMonth(); // 0 a 11
    let targetYear = purchaseDate.getFullYear();

    if (purchaseDay >= closingDay) {
      // Entra na fatura do mês seguinte
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }

    // Calcula data exata de fechamento
    // Se o mês tiver menos dias que closingDay (ex: fevereiro dia 30), ajusta para o último dia do mês
    const maxDaysInClosingMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const effectiveClosingDay = Math.min(closingDay, maxDaysInClosingMonth);
    const closingDate = new Date(targetYear, targetMonth, effectiveClosingDay, 23, 59, 59, 999);

    // Calcula data exata de vencimento
    // No Brasil, se dueDay <= closingDay, o vencimento é no mês seguinte ao fechamento
    let dueMonth = targetMonth;
    let dueYear = targetYear;
    if (dueDay <= closingDay) {
      dueMonth += 1;
      if (dueMonth > 11) {
        dueMonth = 0;
        dueYear += 1;
      }
    }

    const maxDaysInDueMonth = new Date(dueYear, dueMonth + 1, 0).getDate();
    const effectiveDueDay = Math.min(dueDay, maxDaysInDueMonth);
    const dueDate = new Date(dueYear, dueMonth, effectiveDueDay, 23, 59, 59, 999);

    return {
      month: targetMonth + 1, // 1 a 12
      year: targetYear,
      closingDate,
      dueDate
    };
  }

  /**
   * Calcula a divisão exata de uma compra em N parcelas inteiras em centavos.
   * Se houver resto indivisível, a primeira parcela absorve o centavo residual.
   * Exemplo: R$ 100,00 (10000 centavos) em 3x:
   * 10000 / 3 = 3333 com resto 1.
   * Parcela 1: 3334 centavos (R$ 33,34)
   * Parcela 2: 3333 centavos (R$ 33,33)
   * Parcela 3: 3333 centavos (R$ 33,33)
   * Soma total = 10000 centavos (R$ 100,00 exatos).
   */
  public static calculateInstallments(
    totalAmountCents: bigint,
    totalInstallments: number
  ): bigint[] {
    if (totalInstallments <= 0) {
      throw new Error('O número de parcelas deve ser maior que zero');
    }

    const installmentsCount = BigInt(totalInstallments);
    const baseAmount = totalAmountCents / installmentsCount;
    const remainder = totalAmountCents % installmentsCount;

    const result: bigint[] = [];
    for (let i = 0; i < totalInstallments; i++) {
      // A primeira parcela absorve o resto da divisão
      if (i === 0) {
        result.push(baseAmount + remainder);
      } else {
        result.push(baseAmount);
      }
    }

    return result;
  }
}
