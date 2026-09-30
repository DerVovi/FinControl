import { prisma } from '../../infrastructure/database/prisma.js';
import { Money } from '../../domain/money.js';
import { CardInvoiceEngine } from '../../domain/card-invoice-engine.js';

export class ListCardsUseCase {
  public static async execute(userId: string) {
    const cards = await prisma.creditCard.findMany({
      where: { userId },
      include: {
        invoices: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }]
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const now = new Date();

    return cards.map((card) => {
      // 1. Determina qual é o ciclo de fatura corrente para novas compras
      const currentPeriod = CardInvoiceEngine.determineInvoicePeriod(
        now,
        card.closingDay,
        card.dueDay
      );

      let currentOpenInvoice = card.invoices.find(
        (inv) => inv.month === currentPeriod.month && inv.year === currentPeriod.year
      );

      // Se ainda não existir no banco, provisiona ou pega a mais recente
      if (!currentOpenInvoice && card.invoices.length > 0) {
        currentOpenInvoice = card.invoices[0];
      }

      // 2. Calcula limite comprometido somando saldo devedor de todas as faturas não pagas
      let compromisedCents = 0n;
      for (const inv of card.invoices) {
        if (inv.status !== 'PAID') {
          const debt = inv.totalCents - inv.paidCents;
          if (debt > 0n) {
            compromisedCents += debt;
          }
        }
      }

      const totalLimit = Money.fromCents(card.limitCents);
      const compromised = Money.fromCents(compromisedCents);
      const available = totalLimit.subtract(compromised);

      return {
        id: card.id,
        name: card.name,
        institution: card.institution,
        closingDay: card.closingDay,
        dueDay: card.dueDay,
        lastFourDigits: card.lastFourDigits,
        color: card.color,
        status: card.status,
        limitCents: card.limitCents.toString(),
        formattedLimit: totalLimit.formatBRL(),
        compromisedCents: compromised.toCents().toString(),
        formattedCompromised: compromised.formatBRL(),
        availableLimitCents: (available.isNegative() ? 0n : available.toCents()).toString(),
        formattedAvailable: (available.isNegative() ? Money.zero() : available).formatBRL(),
        currentInvoice: currentOpenInvoice
          ? {
              id: currentOpenInvoice.id,
              month: currentOpenInvoice.month,
              year: currentOpenInvoice.year,
              closingDate: currentOpenInvoice.closingDate,
              dueDate: currentOpenInvoice.dueDate,
              status: currentOpenInvoice.status,
              totalCents: currentOpenInvoice.totalCents.toString(),
              formattedTotal: Money.fromCents(currentOpenInvoice.totalCents).formatBRL(),
              paidCents: currentOpenInvoice.paidCents.toString(),
              remainingCents: (
                currentOpenInvoice.totalCents - currentOpenInvoice.paidCents
              ).toString(),
              formattedRemaining: Money.fromCents(
                currentOpenInvoice.totalCents - currentOpenInvoice.paidCents
              ).formatBRL()
            }
          : null
      };
    });
  }
}
