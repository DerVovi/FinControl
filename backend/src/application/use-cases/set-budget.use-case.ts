import { prisma } from '../../infrastructure/database/prisma.js';
import { AppError } from '../../presentation/errors/app-error.js';

export interface SetBudgetInput {
  userId: string;
  categoryId: string;
  month: number;
  year: number;
  amountCents: bigint;
  alertThresholdPct?: number;
}

export class SetBudgetUseCase {
  public static async execute(input: SetBudgetInput) {
    if (input.amountCents <= 0n) {
      throw new AppError('O limite do orçamento deve ser positivo e maior que zero');
    }
    if (input.month < 1 || input.month > 12) {
      throw new AppError('Mês inválido');
    }

    // Validação Anti-IDOR: garante que a categoria pertence ao usuário ou é do sistema
    const category = await prisma.category.findFirst({
      where: {
        id: input.categoryId,
        OR: [{ userId: input.userId }, { isSystem: true }]
      }
    });

    if (!category) {
      throw new AppError('Categoria não encontrada ou não pertence ao usuário', 404, 'CATEGORY_NOT_FOUND');
    }

    const budget = await prisma.budget.upsert({
      where: {
        userId_categoryId_month_year: {
          userId: input.userId,
          categoryId: input.categoryId,
          month: input.month,
          year: input.year
        }
      },
      update: {
        amountCents: input.amountCents,
        alertThresholdPct: input.alertThresholdPct || 80
      },
      create: {
        userId: input.userId,
        categoryId: input.categoryId,
        month: input.month,
        year: input.year,
        amountCents: input.amountCents,
        alertThresholdPct: input.alertThresholdPct || 80
      },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } }
      }
    });

    return {
      ...budget,
      amountCents: budget.amountCents.toString()
    };
  }
}
