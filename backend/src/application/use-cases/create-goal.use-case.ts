import { prisma } from '../../infrastructure/database/prisma.js';
import { AppError } from '../../presentation/errors/app-error.js';

export interface CreateGoalInput {
  userId: string;
  name: string;
  targetAmountCents: bigint;
  initialAmountCents?: bigint;
  targetDate?: Date;
  color?: string;
}

export class CreateGoalUseCase {
  public static async execute(input: CreateGoalInput) {
    if (input.targetAmountCents <= 0n) {
      throw new AppError('O valor da meta deve ser maior que zero');
    }

    const currentAmount = input.initialAmountCents ?? 0n;

    const goal = await prisma.goal.create({
      data: {
        userId: input.userId,
        name: input.name.trim(),
        targetAmountCents: input.targetAmountCents,
        currentAmountCents: currentAmount,
        targetDate: input.targetDate,
        color: input.color || '#10B981',
        status: currentAmount >= input.targetAmountCents ? 'COMPLETED' : 'IN_PROGRESS'
      }
    });

    return {
      ...goal,
      targetAmountCents: goal.targetAmountCents.toString(),
      currentAmountCents: goal.currentAmountCents.toString()
    };
  }
}
