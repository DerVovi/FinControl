import { prisma } from '../../infrastructure/database/prisma.js';
import { RecurringEngine } from '../../domain/recurring-engine.js';
import { AppError, NotFoundError } from '../../presentation/errors/app-error.js';

export interface CreateRecurringInput {
  userId: string;
  accountId: string;
  categoryId?: string;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  amountCents: bigint;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  dayOfMonth?: number;
  startDate: Date;
  endDate?: Date;
}

export class CreateRecurringUseCase {
  public static async execute(input: CreateRecurringInput) {
    if (input.amountCents <= 0n) {
      throw new AppError('O valor da recorrência deve ser positivo e maior que zero');
    }

    const account = await prisma.account.findFirst({
      where: { id: input.accountId, userId: input.userId }
    });

    if (!account) {
      throw new NotFoundError('Conta não encontrada ou não pertence ao usuário');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Cria a regra mestre de recorrência
      const recurring = await tx.recurringTransaction.create({
        data: {
          userId: input.userId,
          accountId: input.accountId,
          categoryId: input.categoryId,
          description: input.description.trim(),
          type: input.type,
          amountCents: input.amountCents,
          frequency: input.frequency,
          dayOfMonth: input.dayOfMonth,
          startDate: input.startDate,
          endDate: input.endDate,
          active: true
        }
      });

      // 2. Materializa previamente instâncias na janela móvel de 60 dias (com status PENDING)
      const futureDates = RecurringEngine.calculateNextDates({
        startDate: input.startDate,
        frequency: input.frequency,
        dayOfMonth: input.dayOfMonth,
        horizonDays: 60,
        endDate: input.endDate
      });

      const materialized = [];
      for (const d of futureDates) {
        const trans = await tx.transaction.create({
          data: {
            userId: input.userId,
            accountId: input.accountId,
            categoryId: input.categoryId,
            type: input.type,
            amountCents: input.amountCents,
            date: d,
            description: input.description.trim(),
            status: 'PENDING',
            isRecurring: true,
            recurringTransactionId: recurring.id
          }
        });
        materialized.push(trans);
      }

      return {
        ...recurring,
        amountCents: recurring.amountCents.toString(),
        materializedCount: materialized.length
      };
    });
  }
}
