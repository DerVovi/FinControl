import { prisma } from '../../infrastructure/database/prisma.js';
import { WalletNotificationParser } from '../../domain/services/wallet-notification-parser.js';
import { ManageWebhookKeyUseCase } from './manage-webhook-key.use-case.js';
import { CreateCardPurchaseUseCase } from './create-card-purchase.use-case.js';
import { CreateTransactionUseCase } from './create-transaction.use-case.js';
import { AppError, UnauthorizedError } from '../../presentation/errors/app-error.js';

export interface ProcessWalletWebhookInput {
  apiKey: string;
  title?: string;
  text?: string;
  raw?: string;
  amountCents?: string;
  description?: string;
  lastFourDigits?: string;
}

export class ProcessWalletWebhookUseCase {
  public static async execute(input: ProcessWalletWebhookInput) {
    // 1. Validação estrita da Chave de API de Webhook
    if (!input.apiKey) {
      throw new UnauthorizedError('Chave de API do Webhook é obrigatória (cabeçalho X-Api-Key)');
    }

    const auth = await ManageWebhookKeyUseCase.validateKey(input.apiKey);
    if (!auth) {
      throw new UnauthorizedError('Chave de API do Webhook inválida ou revogada');
    }

    const userId = auth.userId;

    // 2. Parser da Notificação
    let amountCents: bigint;
    let description: string;
    let lastFourDigits: string | undefined;
    let suggestedCategoryType: string | undefined;

    if (input.amountCents) {
      amountCents = BigInt(input.amountCents);
      description = input.description || 'Compra Carteira do Google';
      lastFourDigits = input.lastFourDigits;
    } else {
      const parsed = WalletNotificationParser.parse({
        title: input.title,
        text: input.text,
        raw: input.raw
      });

      amountCents = parsed.amountCents;
      description = input.description || parsed.description;
      lastFourDigits = input.lastFourDigits || parsed.lastFourDigits;
      suggestedCategoryType = parsed.suggestedCategoryType;
    }

    if (amountCents <= 0n) {
      throw new AppError('O valor da transação deve ser positivo e maior que zero');
    }

    // 3. Deduplicação de Notificações (FIN-020) — janela de 5 minutos
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        userId,
        amountCents,
        description,
        createdAt: { gte: fiveMinutesAgo }
      }
    });

    if (existingTransaction) {
      return {
        success: true,
        duplicate: true,
        message: 'Notificação já processada nos últimos 5 minutos (idempotência garantida)',
        transactionId: existingTransaction.id,
        amountCents: existingTransaction.amountCents.toString(),
        description: existingTransaction.description
      };
    }

    // 4. Mapeamento heurístico de Categoria
    const expenseCategories = await prisma.category.findMany({
      where: {
        type: 'EXPENSE',
        OR: [{ userId }, { isSystem: true }]
      }
    });

    let categoryId: string | undefined = undefined;

    if (suggestedCategoryType && suggestedCategoryType !== 'OUTROS') {
      const typeMap: Record<string, string[]> = {
        ALIMENTACAO: ['alimentação', 'alimentacao', 'mercado', 'restaurante', 'refeição'],
        TRANSPORTE: ['transporte', 'combustível', 'combustivel', 'veículo'],
        SAUDE: ['saúde', 'saude', 'farmácia', 'farmacia', 'médico'],
        LAZER: ['lazer', 'entretenimento', 'viagem'],
        MORADIA: ['moradia', 'habitação', 'casa']
      };

      const keywords = typeMap[suggestedCategoryType] || [];
      const matched = expenseCategories.find(c =>
        keywords.some(k => c.name.toLowerCase().includes(k))
      );
      if (matched) {
        categoryId = matched.id;
      }
    }

    if (!categoryId) {
      const defaultCat = expenseCategories.find(c => c.name.toLowerCase().includes('outros')) || expenseCategories[0];
      categoryId = defaultCat?.id;
    }

    // 5. Identificação do Cartão de Crédito ou Conta Bancária
    let creditCard = null;
    if (lastFourDigits) {
      creditCard = await prisma.creditCard.findFirst({
        where: {
          userId,
          lastFourDigits,
          status: 'ACTIVE'
        }
      });
    }

    // Se encontrou cartão correspondente pelos 4 dígitos finais, lança como compra no cartão
    if (creditCard) {
      const purchase = await CreateCardPurchaseUseCase.execute({
        userId,
        cardId: creditCard.id,
        categoryId,
        description,
        totalAmountCents: amountCents,
        totalInstallments: 1,
        purchaseDate: new Date(),
        notes: 'Lançado automaticamente via Carteira do Google'
      });

      return {
        success: true,
        duplicate: false,
        type: 'CARD_PURCHASE',
        paymentMethod: `Cartão de Crédito (${creditCard.name} •••• ${creditCard.lastFourDigits})`,
        transactionId: (purchase as any).transaction?.id || (purchase as any).purchase?.id,
        amountCents: amountCents.toString(),
        description,
        cardId: creditCard.id,
        categoryId
      };
    }

    // Se não houver cartão correspondente, lança na primeira conta bancária ativa
    const defaultAccount = await prisma.account.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' }
    });

    if (!defaultAccount) {
      throw new AppError('Nenhuma conta bancária ativa encontrada para debitar a despesa');
    }

    const transaction = await CreateTransactionUseCase.execute({
      userId,
      accountId: defaultAccount.id,
      categoryId,
      type: 'EXPENSE',
      amountCents,
      date: new Date(),
      description,
      notes: 'Lançado automaticamente via Carteira do Google'
    });

    return {
      success: true,
      duplicate: false,
      type: 'ACCOUNT_EXPENSE',
      paymentMethod: `Conta Bancária (${defaultAccount.name})`,
      transactionId: transaction.id,
      amountCents: amountCents.toString(),
      description,
      accountId: defaultAccount.id,
      categoryId
    };
  }
}
