import { prisma } from '../../infrastructure/database/prisma.js';
import { CardInvoiceEngine } from '../../domain/card-invoice-engine.js';
import { AppError, NotFoundError } from '../../presentation/errors/app-error.js';

export interface CreateCardPurchaseInput {
  userId: string;
  cardId: string;
  categoryId?: string;
  description: string;
  totalAmountCents: bigint;
  totalInstallments?: number;
  purchaseDate: Date;
  notes?: string;
}

export class CreateCardPurchaseUseCase {
  public static async execute(input: CreateCardPurchaseInput) {
    if (input.totalAmountCents <= 0n) {
      throw new AppError('O valor da compra deve ser positivo e maior que zero');
    }

    const installmentsCount = input.totalInstallments || 1;
    if (installmentsCount < 1) {
      throw new AppError('O número de parcelas deve ser de no mínimo 1');
    }

    // 1. Busca cartão de crédito do usuário
    const card = await prisma.creditCard.findFirst({
      where: { id: input.cardId, userId: input.userId },
      include: {
        invoices: {
          where: { status: { not: 'PAID' } }
        }
      }
    });

    if (!card || card.status !== 'ACTIVE') {
      throw new NotFoundError('Cartão de crédito não encontrado ou inativo');
    }

    // 2. Validação de limite disponível
    let totalUnpaid = 0n;
    for (const inv of card.invoices) {
      const debt = inv.totalCents - inv.paidCents;
      if (debt > 0n) totalUnpaid += debt;
    }
    const availableLimit = card.limitCents - totalUnpaid;
    if (input.totalAmountCents > availableLimit) {
      throw new AppError('Limite de crédito disponível insuficiente para esta compra');
    }

    // 3. Validação Anti-IDOR de categoria
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

    return prisma.$transaction(async (tx) => {
      // Helper para buscar ou provisionar uma fatura para determinado mês/ano
      async function getOrCreateInvoice(period: {
        month: number;
        year: number;
        closingDate: Date;
        dueDate: Date;
      }) {
        let invoice = await tx.invoice.findUnique({
          where: {
            cardId_month_year: {
              cardId: card!.id,
              month: period.month,
              year: period.year
            }
          }
        });

        if (!invoice) {
          invoice = await tx.invoice.create({
            data: {
              cardId: card!.id,
              userId: input.userId,
              month: period.month,
              year: period.year,
              closingDate: period.closingDate,
              dueDate: period.dueDate,
              totalCents: 0n,
              paidCents: 0n,
              status: 'OPEN'
            }
          });
        }

        return invoice;
      }

      // CASO A: Compra à Vista (1 parcela)
      if (installmentsCount === 1) {
        const period = CardInvoiceEngine.determineInvoicePeriod(
          input.purchaseDate,
          card.closingDay,
          card.dueDay
        );

        const invoice = await getOrCreateInvoice(period);

        // Incrementa o valor total da fatura
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { totalCents: { increment: input.totalAmountCents } }
        });

        // Cria a transação de despesa do cartão
        const transaction = await tx.transaction.create({
          data: {
            userId: input.userId,
            cardId: card.id,
            invoiceId: invoice.id,
            categoryId: input.categoryId,
            type: 'EXPENSE',
            amountCents: input.totalAmountCents,
            date: input.purchaseDate,
            description: input.description.trim(),
            notes: input.notes,
            status: 'CONFIRMED'
          },
          include: {
            category: true,
            card: { select: { id: true, name: true, color: true } }
          }
        });

        return {
          type: 'SINGLE',
          transaction: {
            ...transaction,
            amountCents: transaction.amountCents.toString()
          },
          invoice: {
            id: invoice.id,
            month: invoice.month,
            year: invoice.year
          }
        };
      }

      // CASO B: Compra Parcelada (N parcelas)
      const installmentAmounts = CardInvoiceEngine.calculateInstallments(
        input.totalAmountCents,
        installmentsCount
      );

      // Cria a compra mãe
      const purchase = await tx.installmentPurchase.create({
        data: {
          userId: input.userId,
          cardId: card.id,
          categoryId: input.categoryId,
          description: input.description.trim(),
          totalAmountCents: input.totalAmountCents,
          totalInstallments: installmentsCount,
          purchaseDate: input.purchaseDate
        }
      });

      const createdInstallments: any[] = [];

      for (let i = 0; i < installmentsCount; i++) {
        // Data simulada para cada parcela: mês da compra + i meses
        const instDate = new Date(input.purchaseDate);
        instDate.setMonth(instDate.getMonth() + i);

        const period = CardInvoiceEngine.determineInvoicePeriod(
          instDate,
          card.closingDay,
          card.dueDay
        );

        const invoice = await getOrCreateInvoice(period);
        const instAmount = installmentAmounts[i];

        // Incrementa o total da fatura daquele mês específico
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { totalCents: { increment: instAmount } }
        });

        // Cria o registro da parcela filha
        const installment = await tx.installment.create({
          data: {
            purchaseId: purchase.id,
            invoiceId: invoice.id,
            installmentNumber: i + 1,
            totalInstallments: installmentsCount,
            amountCents: instAmount,
            dueDate: invoice.dueDate,
            status: 'BILLED'
          }
        });

        createdInstallments.push({
          ...installment,
          amountCents: installment.amountCents.toString(),
          invoice: { id: invoice.id, month: invoice.month, year: invoice.year }
        });
      }

      // Cria o registro da transação geral de despesa
      const transaction = await tx.transaction.create({
        data: {
          userId: input.userId,
          cardId: card.id,
          invoiceId: createdInstallments[0].invoiceId,
          categoryId: input.categoryId,
          type: 'EXPENSE',
          amountCents: input.totalAmountCents,
          date: input.purchaseDate,
          description: `${input.description.trim()} (1/${installmentsCount})`,
          notes: input.notes,
          status: 'CONFIRMED'
        }
      });

      return {
        type: 'INSTALLMENTS',
        purchase: {
          ...purchase,
          totalAmountCents: purchase.totalAmountCents.toString()
        },
        installments: createdInstallments,
        transaction: {
          ...transaction,
          amountCents: transaction.amountCents.toString()
        }
      };
    }, { maxWait: 15000, timeout: 30000 });
  }
}
