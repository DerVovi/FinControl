import { prisma } from '../../infrastructure/database/prisma.js';
import { AppError, NotFoundError } from '../../presentation/errors/app-error.js';

export interface ContributeGoalInput {
  userId: string;
  goalId: string;
  amountCents: bigint;
  accountId?: string;
  notes?: string;
  date?: Date;
}

export class ContributeGoalUseCase {
  public static async execute(input: ContributeGoalInput) {
    if (input.amountCents <= 0n) {
      throw new AppError('O valor do aporte deve ser positivo e maior que zero');
    }

    const goal = await prisma.goal.findFirst({
      where: { id: input.goalId, userId: input.userId }
    });

    if (!goal) {
      throw new NotFoundError('Meta financeira não encontrada');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Se informou conta bancária, valida saldo e debita o aporte
      if (input.accountId) {
        const account = await tx.account.findFirst({
          where: { id: input.accountId, userId: input.userId }
        });

        if (!account) {
          throw new NotFoundError('Conta bancária não encontrada');
        }

        if (account.currentBalanceCents < input.amountCents) {
          throw new AppError('Saldo insuficiente na conta bancária para realizar o aporte na meta');
        }

        await tx.account.update({
          where: { id: account.id },
          data: { currentBalanceCents: { decrement: input.amountCents } }
        });
      }

      // 2. Atualiza saldo da meta
      const newCurrentCents = goal.currentAmountCents + input.amountCents;
      const isCompleted = newCurrentCents >= goal.targetAmountCents;

      const updatedGoal = await tx.goal.update({
        where: { id: goal.id },
        data: {
          currentAmountCents: newCurrentCents,
          status: isCompleted ? 'COMPLETED' : 'IN_PROGRESS'
        }
      });

      // 3. Registra a contribuição
      const contribution = await tx.goalContribution.create({
        data: {
          goalId: goal.id,
          userId: input.userId,
          accountId: input.accountId,
          amountCents: input.amountCents,
          notes: input.notes,
          date: input.date || new Date()
        }
      });

      return {
        goal: {
          ...updatedGoal,
          targetAmountCents: updatedGoal.targetAmountCents.toString(),
          currentAmountCents: updatedGoal.currentAmountCents.toString()
        },
        contribution: {
          ...contribution,
          amountCents: contribution.amountCents.toString()
        }
      };
    }, { maxWait: 15000, timeout: 30000 });
  }
}
