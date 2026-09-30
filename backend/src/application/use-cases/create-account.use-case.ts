import { prisma } from '../../infrastructure/database/prisma.js';
import { AppError } from '../../presentation/errors/app-error.js';

export interface CreateAccountInput {
  userId: string;
  name: string;
  type: string;
  initialBalanceCents?: bigint;
  color?: string;
}

const VALID_ACCOUNT_TYPES = ['CHECKING', 'SAVINGS', 'DIGITAL', 'WALLET', 'INVESTMENT'];

export class CreateAccountUseCase {
  public static async execute(input: CreateAccountInput) {
    if (!VALID_ACCOUNT_TYPES.includes(input.type)) {
      throw new AppError(`Tipo de conta inválido. Tipos permitidos: ${VALID_ACCOUNT_TYPES.join(', ')}`);
    }

    const initialCents = input.initialBalanceCents ?? 0n;

    const account = await prisma.account.create({
      data: {
        userId: input.userId,
        name: input.name.trim(),
        type: input.type,
        initialBalanceCents: initialCents,
        currentBalanceCents: initialCents,
        color: input.color || '#10B981',
        status: 'ACTIVE'
      }
    });

    return {
      ...account,
      initialBalanceCents: account.initialBalanceCents.toString(),
      currentBalanceCents: account.currentBalanceCents.toString()
    };
  }
}
