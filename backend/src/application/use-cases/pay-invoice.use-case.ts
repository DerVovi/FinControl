import { prisma } from '../../infrastructure/database/prisma.js';
import { AppError, NotFoundError } from '../../presentation/errors/app-error.js';

export interface PayInvoiceInput {
  userId: string;
  invoiceId: string;
  accountId: string;
  amountCents: bigint;
  date?: Date;
}

export class PayInvoiceUseCase {
  public static async execute(input: PayInvoiceInput) {
    if (input.amountCents <= 0n) {
      throw new AppError('O valor do pagamento deve ser positivo e maior que zero');
    }

    // 1. Busca fatura
    const invoice = await prisma.invoice.findFirst({
      where: { id: input.invoiceId, userId: input.userId },
      include: { card: true }
    });

    if (!invoice) {
      throw new NotFoundError('Fatura não encontrada');
    }

    const remainingDebt = invoice.totalCents - invoice.paidCents;
    if (remainingDebt <= 0n) {
      throw new AppError('Esta fatura já está integralmente quitada');
    }

    // 2. Busca conta bancária pagadora
    const account = await prisma.account.findFirst({
      where: { id: input.accountId, userId: input.userId }
    });

    if (!account || account.status !== 'ACTIVE') {
      throw new NotFoundError('Conta bancária de pagamento não encontrada ou inativa');
    }

    if (account.currentBalanceCents < input.amountCents) {
      throw new AppError('Saldo insuficiente na conta bancária para efetuar o pagamento da fatura');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Debita a conta bancária
      await tx.account.update({
        where: { id: account.id },
        data: { currentBalanceCents: { decrement: input.amountCents } }
      });

      // 2. Credita o valor pago na fatura
      const newPaidCents = invoice.paidCents + input.amountCents;
      const isFullyPaid = newPaidCents >= invoice.totalCents;

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidCents: newPaidCents,
          status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID'
        }
      });

      // 3. Cria a transação do tipo INVOICE_PAYMENT na conta bancária
      // (Não duplica despesas de consumo nos relatórios do mês)
      const paymentDate = input.date || new Date();
      const transaction = await tx.transaction.create({
        data: {
          userId: input.userId,
          accountId: account.id,
          cardId: invoice.cardId,
          invoiceId: invoice.id,
          type: 'INVOICE_PAYMENT',
          amountCents: input.amountCents,
          date: paymentDate,
          description: `Pagamento Fatura ${invoice.card.name} (${invoice.month}/${invoice.year})`,
          status: 'CONFIRMED'
        }
      });

      return {
        success: true,
        invoice: {
          ...updatedInvoice,
          totalCents: updatedInvoice.totalCents.toString(),
          paidCents: updatedInvoice.paidCents.toString(),
          remainingCents: (updatedInvoice.totalCents - updatedInvoice.paidCents).toString()
        },
        transaction: {
          ...transaction,
          amountCents: transaction.amountCents.toString()
        }
      };
    }, { maxWait: 15000, timeout: 30000 });
  }
}
