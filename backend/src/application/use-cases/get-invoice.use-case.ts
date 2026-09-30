import { prisma } from '../../infrastructure/database/prisma.js';
import { Money } from '../../domain/money.js';
import { NotFoundError } from '../../presentation/errors/app-error.js';

export class GetInvoiceUseCase {
  public static async execute(userId: string, invoiceId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      include: {
        card: true,
        transactions: {
          include: { category: true },
          orderBy: { date: 'desc' }
        },
        installments: {
          include: {
            purchase: {
              include: { category: true }
            }
          },
          orderBy: { installmentNumber: 'asc' }
        }
      }
    });

    if (!invoice) {
      throw new NotFoundError('Fatura não encontrada');
    }

    const totalMoney = Money.fromCents(invoice.totalCents);
    const paidMoney = Money.fromCents(invoice.paidCents);
    const remainingMoney = totalMoney.subtract(paidMoney);

    return {
      id: invoice.id,
      month: invoice.month,
      year: invoice.year,
      closingDate: invoice.closingDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      totalCents: invoice.totalCents.toString(),
      formattedTotal: totalMoney.formatBRL(),
      paidCents: invoice.paidCents.toString(),
      formattedPaid: paidMoney.formatBRL(),
      remainingCents: remainingMoney.toCents().toString(),
      formattedRemaining: remainingMoney.formatBRL(),
      card: {
        id: invoice.card.id,
        name: invoice.card.name,
        institution: invoice.card.institution,
        color: invoice.card.color
      },
      transactions: invoice.transactions.map((tx) => ({
        id: tx.id,
        description: tx.description,
        amountCents: tx.amountCents.toString(),
        formattedAmount: Money.fromCents(tx.amountCents).formatBRL(),
        date: tx.date,
        category: tx.category ? { id: tx.category.id, name: tx.category.name, color: tx.category.color } : null
      })),
      installments: invoice.installments.map((inst) => ({
        id: inst.id,
        description: inst.purchase.description,
        installmentNumber: inst.installmentNumber,
        totalInstallments: inst.totalInstallments,
        installmentLabel: `${inst.installmentNumber}/${inst.totalInstallments}`,
        amountCents: inst.amountCents.toString(),
        formattedAmount: Money.fromCents(inst.amountCents).formatBRL(),
        purchaseDate: inst.purchase.purchaseDate,
        category: inst.purchase.category
          ? { id: inst.purchase.category.id, name: inst.purchase.category.name, color: inst.purchase.category.color }
          : null
      }))
    };
  }
}
