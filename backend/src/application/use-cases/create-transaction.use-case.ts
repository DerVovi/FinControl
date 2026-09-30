import { prisma } from '../../infrastructure/database/prisma.js';
import { AppError, NotFoundError } from '../../presentation/errors/app-error.js';

export interface CreateTransactionInput {
  userId: string;
  accountId: string;
  destinationAccountId?: string;
  categoryId?: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVOICE_PAYMENT';
  amountCents: bigint;
  date: Date;
  description: string;
  notes?: string;
}

export class CreateTransactionUseCase {
  public static async execute(input: CreateTransactionInput) {
    if (input.amountCents <= 0n) {
      throw new AppError('O valor da transação deve ser positivo e maior que zero');
    }

    // 1. Valida conta de origem pertencente ao usuário
    const sourceAccount = await prisma.account.findFirst({
      where: { id: input.accountId, userId: input.userId }
    });

    if (!sourceAccount) {
      throw new NotFoundError('Conta de origem não encontrada ou não pertence ao usuário');
    }

    // 2. Validação Anti-IDOR de Categoria (se informada)
    if (input.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: input.categoryId,
          OR: [{ userId: input.userId }, { isSystem: true }]
        }
      });
      if (!category) {
        throw new NotFoundError('Categoria não encontrada ou não pertence ao usuário');
      }
    }

    // 3. Regra para TRANSFERÊNCIA:
    // Uma transferência entre contas do mesmo usuário NÃO é receita nem despesa.
    // Debita a origem e credita o destino atomicamente.
    if (input.type === 'TRANSFER') {
      if (!input.destinationAccountId) {
        throw new AppError('Conta de destino é obrigatória para transferências');
      }

      if (input.destinationAccountId === input.accountId) {
        throw new AppError('A conta de destino não pode ser igual à conta de origem');
      }

      const destAccount = await prisma.account.findFirst({
        where: { id: input.destinationAccountId, userId: input.userId }
      });

      if (!destAccount) {
        throw new NotFoundError('Conta de destino não encontrada ou não pertence ao usuário');
      }

      return prisma.$transaction(async (tx) => {
        // Debita origem
        await tx.account.update({
          where: { id: sourceAccount.id },
          data: { currentBalanceCents: { decrement: input.amountCents } }
        });

        // Credita destino
        await tx.account.update({
          where: { id: destAccount.id },
          data: { currentBalanceCents: { increment: input.amountCents } }
        });

        // Cria registro da transferência
        const transaction = await tx.transaction.create({
          data: {
            userId: input.userId,
            accountId: input.accountId,
            destinationAccountId: input.destinationAccountId,
            type: 'TRANSFER',
            amountCents: input.amountCents,
            date: input.date,
            description: input.description.trim(),
            notes: input.notes,
            status: 'CONFIRMED'
          },
          include: {
            account: { select: { id: true, name: true } },
            destinationAccount: { select: { id: true, name: true } }
          }
        });

        return {
          ...transaction,
          amountCents: transaction.amountCents.toString()
        };
      }, { maxWait: 15000, timeout: 30000 });
    }

    // 3. Regra para DESPESA
    if (input.type === 'EXPENSE') {
      return prisma.$transaction(async (tx) => {
        await tx.account.update({
          where: { id: sourceAccount.id },
          data: { currentBalanceCents: { decrement: input.amountCents } }
        });

        const transaction = await tx.transaction.create({
          data: {
            userId: input.userId,
            accountId: input.accountId,
            categoryId: input.categoryId,
            type: 'EXPENSE',
            amountCents: input.amountCents,
            date: input.date,
            description: input.description.trim(),
            notes: input.notes,
            status: 'CONFIRMED'
          },
          include: {
            account: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, color: true, icon: true } }
          }
        });

        return {
          ...transaction,
          amountCents: transaction.amountCents.toString()
        };
      }, { maxWait: 15000, timeout: 30000 });
    }

    // 4. Regra para RECEITA
    if (input.type === 'INCOME') {
      return prisma.$transaction(async (tx) => {
        await tx.account.update({
          where: { id: sourceAccount.id },
          data: { currentBalanceCents: { increment: input.amountCents } }
        });

        const transaction = await tx.transaction.create({
          data: {
            userId: input.userId,
            accountId: input.accountId,
            categoryId: input.categoryId,
            type: 'INCOME',
            amountCents: input.amountCents,
            date: input.date,
            description: input.description.trim(),
            notes: input.notes,
            status: 'CONFIRMED'
          },
          include: {
            account: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, color: true, icon: true } }
          }
        });

        return {
          ...transaction,
          amountCents: transaction.amountCents.toString()
        };
      }, { maxWait: 15000, timeout: 30000 });
    }

    // 5. Regra para PAGAMENTO DE FATURA (INVOICE_PAYMENT)
    // Debita a conta corrente e liquida a fatura, NÃO duplicando as despesas de consumo do mês.
    if (input.type === 'INVOICE_PAYMENT') {
      return prisma.$transaction(async (tx) => {
        await tx.account.update({
          where: { id: sourceAccount.id },
          data: { currentBalanceCents: { decrement: input.amountCents } }
        });

        const transaction = await tx.transaction.create({
          data: {
            userId: input.userId,
            accountId: input.accountId,
            type: 'INVOICE_PAYMENT',
            amountCents: input.amountCents,
            date: input.date,
            description: input.description.trim(),
            notes: input.notes,
            status: 'CONFIRMED'
          },
          include: {
            account: { select: { id: true, name: true } }
          }
        });

        return {
          ...transaction,
          amountCents: transaction.amountCents.toString()
        };
      }, { maxWait: 15000, timeout: 30000 });
    }

    throw new AppError('Tipo de transação não suportado');
  }
}
