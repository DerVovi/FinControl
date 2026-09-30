export interface ParsedWalletNotification {
  amountCents: bigint;
  description: string;
  lastFourDigits?: string;
  suggestedCategoryType?: 'ALIMENTACAO' | 'TRANSPORTE' | 'SAUDE' | 'LAZER' | 'MORADIA' | 'OUTROS';
  rawText: string;
}

export class WalletNotificationParser {
  private static readonly GENERIC_TITLES = [
    'carteira do google',
    'google wallet',
    'google pay',
    'gpay',
    'pagamento',
    'compra aprovada',
    'carteira'
  ];

  /**
   * Extrai valor em centavos (BigInt), estabelecimento e últimos 4 dígitos do cartão
   * a partir do título e texto emitidos pela notificação da Carteira do Google.
   */
  public static parse(payload: { title?: string; text?: string; raw?: string }): ParsedWalletNotification {
    const title = (payload.title || '').trim();
    const text = (payload.text || payload.raw || '').trim();
    const combined = `${title} ${text}`.trim();

    if (!combined) {
      throw new Error('Texto da notificação está vazio');
    }

    // 1. Extração do Valor em centavos
    const amountCents = this.extractAmountCents(combined);
    if (!amountCents || amountCents <= 0n) {
      throw new Error('Não foi possível identificar o valor da transação na notificação');
    }

    // 2. Extração dos 4 dígitos finais do cartão
    const lastFourDigits = this.extractCardDigits(combined);

    // 3. Extração do Estabelecimento / Descrição
    const description = this.extractDescription(title, text, combined);

    // 4. Categoria Sugerida
    const suggestedCategoryType = this.guessCategory(description);

    return {
      amountCents,
      description,
      lastFourDigits,
      suggestedCategoryType,
      rawText: combined
    };
  }

  private static extractAmountCents(text: string): bigint | null {
    // Procura por R$ 1.250,50 ou R$ 45,90 ou 45,90
    const currencyMatch = text.match(/(?:R\$\s*|BRL\s*)([\d\.]+,\d{2})/i) ||
                          text.match(/\b([\d\.]+,\d{2})\b/);

    if (!currencyMatch) {
      return null;
    }

    const cleanNumber = currencyMatch[1].replace(/\./g, '').replace(',', '');
    return BigInt(cleanNumber);
  }

  private static extractCardDigits(text: string): string | undefined {
    // Procura por "final 1234", "•••• 1234", "**** 1234", "cartão 1234"
    const digitMatch = text.match(/(?:final|••••|\*\*\*\*|terminad[oa] em)\s*(\d{4})\b/i) ||
                       text.match(/(?:cartão|card)\s*(?:••••|\*\*\*\*|\s)*(\d{4})\b/i) ||
                       text.match(/\b\d{4}\b(?=\s*(?:com|no|na|$))/);

    return digitMatch ? digitMatch[1] : undefined;
  }

  private static extractDescription(title: string, text: string, combined: string): string {
    const isGenericTitle = !title || this.GENERIC_TITLES.some(g => title.toLowerCase().includes(g));

    if (!isGenericTitle && title.length >= 2) {
      // O título é o próprio estabelecimento (ex: "Supermercado Pão de Açúcar")
      return this.cleanMerchantName(title);
    }

    // Tenta extrair do texto da notificação:
    // Ex: "R$ 45,50 pago para Posto Shell com Mastercard"
    // Ex: "Você pagou R$ 25,00 em Padaria Central"
    // Ex: "Pagamento de R$ 15,00 para Farmácia São Paulo"
    const merchantPatterns = [
      /(?:pago para|pago em|pago no|pago na)\s+([^,•\d]+?)(?:\s+(?:com|no|na|final|••••|\*\*\*\*|$))/i,
      /(?:em|para|no|na)\s+([^,•\d]+?)(?:\s+(?:com|final|••••|\*\*\*\*|$))/i,
      /(?:você pagou\s+R\$\s*[\d\.]+,\d{2}\s+(?:para|em|no|na))\s+([^,•\d]+)/i
    ];

    for (const pattern of merchantPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const cleaned = this.cleanMerchantName(match[1]);
        if (cleaned.length >= 2) {
          return cleaned;
        }
      }
    }

    return 'Compra Carteira do Google';
  }

  private static cleanMerchantName(raw: string): string {
    return raw
      .replace(/^(para|em|no|na)\s+/i, '')
      .replace(/\s+(com|final|cartão|visa|mastercard|elo).*$/i, '')
      .replace(/[\.\,\;\:\-\_]+$/, '')
      .trim();
  }

  private static guessCategory(merchant: string): 'ALIMENTACAO' | 'TRANSPORTE' | 'SAUDE' | 'LAZER' | 'MORADIA' | 'OUTROS' {
    const m = merchant.toLowerCase();

    const patterns = {
      ALIMENTACAO: ['mercado', 'supermercado', 'padaria', 'restaurante', 'lanchonete', 'ifood', 'burger', 'pizza', 'café', 'cafe', 'bar', 'açougue', 'acougue', 'hortifruti', 'mcdonald', 'outback', 'subway', 'panificadora', 'adega'],
      TRANSPORTE: ['posto', 'combustível', 'combustivel', 'gasolina', 'etanol', 'uber', '99', 'estacionamento', 'pedágio', 'pedagio', 'shell', 'ipiranga', 'petrobras', 'auto posto', 'estapar'],
      SAUDE: ['farmácia', 'farmacia', 'drogaria', 'médico', 'medico', 'hospital', 'laboratório', 'laboratorio', 'clínica', 'clinica', 'raia', 'drogasil', 'pacheco', 'ultrafarma', 'panvel', 'consulta'],
      LAZER: ['cinema', 'teatro', 'show', 'ingresso', 'steam', 'playstation', 'xbox', 'netflix', 'spotify', 'livraria', 'parque', 'clube'],
      MORADIA: ['condomínio', 'condominio', 'aluguel', 'energia', 'enel', 'sabesp', 'copel', 'cemig', 'internet', 'claro', 'vivo', 'tim']
    };

    for (const [category, keywords] of Object.entries(patterns)) {
      if (keywords.some(k => m.includes(k))) {
        return category as any;
      }
    }

    return 'OUTROS';
  }
}
