import { prisma } from '../../infrastructure/database/prisma.js';
import { CardInvoiceEngine } from '../../domain/card-invoice-engine.js';
import { AppError } from '../../presentation/errors/app-error.js';

export interface CreateCardInput {
  userId: string;
  name: string;
  institution: string;
  limitCents: bigint;
  closingDay: number;
  dueDay: number;
  lastFourDigits?: string;
  color?: string;
}

export class CreateCardUseCase {
  public static async execute(input: CreateCardInput) {
    if (input.limitCents <= 0n) {
      throw new AppError('O limite do cartão deve ser maior que zero');
    }
    if (input.closingDay < 1 || input.closingDay > 31) {
      throw new AppError('O dia de fechamento deve estar entre 1 e 31');
    }
    if (input.dueDay < 1 || input.dueDay > 31) {
      throw new AppError('O dia de vencimento deve estar entre 1 e 31');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Cria o cartão de crédito
      const card = await tx.creditCard.create({
        data: {
          userId: input.userId,
          name: input.name.trim(),
          institution: input.institution.trim(),
          limitCents: input.limitCents,
          closingDay: input.closingDay,
          dueDay: input.dueDay,
          lastFourDigits: input.lastFourDigits?.trim(),
          color: input.color || '#8B5CF6',
          status: 'ACTIVE'
        }
      });

      // 2. Provisiona automaticamente a primeira fatura aberta (mês atual)
      const now = new Date();
      const invoicePeriod = CardInvoiceEngine.determineInvoicePeriod(
        now,
        input.closingDay,
        input.dueDay
      );

      const invoice = await tx.invoice.create({
        data: {
          cardId: card.id,
          userId: input.userId,
          month: invoicePeriod.month,
          year: invoicePeriod.year,
          closingDate: invoicePeriod.closingDate,
          dueDate: invoicePeriod.dueDate,
          totalCents: 0n,
          paidCents: 0n,
          status: 'OPEN'
        }
      });

      return {
        ...card,
        limitCents: card.limitCents.toString(),
        initialInvoice: {
          ...invoice,
          totalCents: invoice.totalCents.toString(),
          paidCents: invoice.paidCents.toString()
        }
      };
    });
  }
}
