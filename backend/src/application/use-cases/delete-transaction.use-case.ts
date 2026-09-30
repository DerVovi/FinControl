import { prisma } from '../../infrastructure/database/prisma.js';
import { NotFoundError } from '../../presentation/errors/app-error.js';

export class DeleteTransactionUseCase {
  public static async execute(userId: string, transactionId: string) {
    const txRecord = await prisma.transaction.findFirst({
      where: { id: transactionId, userId }
    });

    if (!txRecord) {
      throw new NotFoundError('Transação não encontrada');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Estorna o saldo na conta bancária correspondente (se houver)
      if (txRecord.accountId) {
        if (txRecord.type === 'INCOME') {
          // Se era receita, remove o valor da conta
          await tx.account.update({
            where: { id: txRecord.accountId },
            data: { currentBalanceCents: { decrement: txRecord.amountCents } }
          });
        } else if (txRecord.type === 'EXPENSE' || txRecord.type === 'INVOICE_PAYMENT') {
          // Se era despesa/pagamento, devolve o valor para a conta
          await tx.account.update({
            where: { id: txRecord.accountId },
            data: { currentBalanceCents: { increment: txRecord.amountCents } }
          });
        } else if (txRecord.type === 'TRANSFER' && txRecord.destinationAccountId) {
          // Estorno da transferência: devolve para a origem e remove do destino
          await tx.account.update({
            where: { id: txRecord.accountId },
            data: { currentBalanceCents: { increment: txRecord.amountCents } }
          });
          await tx.account.update({
            where: { id: txRecord.destinationAccountId },
            data: { currentBalanceCents: { decrement: txRecord.amountCents } }
          });
        }
      }

      // 2. Se estava vinculado a uma fatura de cartão, abate o total da fatura
      if (txRecord.invoiceId && txRecord.type === 'EXPENSE') {
        await tx.invoice.update({
          where: { id: txRecord.invoiceId },
          data: { totalCents: { decrement: txRecord.amountCents } }
        });
      }

      await tx.transaction.delete({
        where: { id: transactionId }
      });

      return { success: true, message: 'Transação excluída e saldos estornados com sucesso.' };
    }, { maxWait: 15000, timeout: 30000 });
  }
}
