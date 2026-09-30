import { prisma } from '../../infrastructure/database/prisma.js';

interface ExportParams {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  type?: string;
  accountId?: string;
}

export class ExportTransactionsUseCase {
  private static sanitizeCsvField(field: string): string {
    if (!field) return '';
    let val = field.toString().trim();
    // Previne CSV Injection (DDE injection) no Excel/Calc
    if (/^[=+\-@\t\r]/.test(val)) {
      val = `'${val}`;
    }
    // Escapa aspas duplas
    if (val.includes('"') || val.includes(';') || val.includes('\n') || val.includes('\r')) {
      val = `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  public static async execute(params: ExportParams) {
    const where: any = { userId: params.userId };

    if (params.startDate || params.endDate) {
      where.date = {};
      if (params.startDate) where.date.gte = params.startDate;
      if (params.endDate) where.date.lte = params.endDate;
    }

    if (params.type && params.type !== 'ALL') {
      where.type = params.type;
    }

    if (params.accountId && params.accountId !== 'ALL') {
      where.OR = [
        { accountId: params.accountId },
        { destinationAccountId: params.accountId }
      ];
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        account: { select: { name: true } },
        destinationAccount: { select: { name: true } },
        category: { select: { name: true } }
      }
    });

    const typeTranslations: Record<string, string> = {
      INCOME: 'Receita',
      EXPENSE: 'Despesa',
      TRANSFER: 'Transferência',
      INVOICE_PAYMENT: 'Pagamento de Fatura'
    };

    // Linha de cabeçalho padrão brasileiro (separador ponto e vírgula)
    const headers = [
      'Data',
      'Descrição',
      'Tipo',
      'Categoria',
      'Conta Origem',
      'Conta Destino',
      'Valor (R$)'
    ];

    const rows: string[] = [headers.join(';')];

    for (const tx of transactions) {
      const dateFormatted = new Date(tx.date).toLocaleDateString('pt-BR');
      const desc = this.sanitizeCsvField(tx.description);
      const type = this.sanitizeCsvField(typeTranslations[tx.type] || tx.type);
      const cat = this.sanitizeCsvField(tx.category?.name || '-');
      const originAcc = this.sanitizeCsvField(tx.account?.name || '-');
      const destAcc = this.sanitizeCsvField(tx.destinationAccount?.name || '-');

      // Formata valor com sinal e vírgula decimal
      const isExpense = tx.type === 'EXPENSE' || tx.type === 'INVOICE_PAYMENT';
      const numVal = (Number(tx.amountCents) / 100).toFixed(2).replace('.', ',');
      const valueFormatted = `${isExpense ? '-' : ''}${numVal}`;

      rows.push([
        dateFormatted,
        desc,
        type,
        cat,
        originAcc,
        destAcc,
        valueFormatted
      ].join(';'));
    }

    const now = new Date();
    const filename = `fincontrol-extrato-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.csv`;

    return {
      csvContent: '\uFEFF' + rows.join('\r\n'), // \uFEFF é o BOM UTF-8 para Excel abrir acentos perfeitamente
      filename,
      count: transactions.length
    };
  }
}
