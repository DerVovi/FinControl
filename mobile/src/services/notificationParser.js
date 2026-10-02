/**
 * ⚡ FinControl Mobile - Native Notification Parser
 * Analisador estrito de notificações bancárias e carteiras digitais (Google Wallet, Nubank, Itaú, Inter, etc.)
 * Regras estritas: Centavos como inteiros (Prompt Mestre) e categorização automática inteligente.
 */

const GENERIC_TITLES = [
  'carteira do google',
  'google wallet',
  'google pay',
  'gpay',
  'pagamento',
  'pagamento aprovado',
  'compra aprovada',
  'compra realizada',
  'compra no débito',
  'compra no crédito',
  'notificação de compra',
  'carteira',
  'nubank',
  'inter',
  'itau',
  'itaú',
  'bradesco',
  'santander',
  'c6 bank',
  'c6',
  'picpay',
  'mercado pago',
  'fincontrol',
];

export function parseNotification(payload) {
  if (!payload) return null;

  const title = (payload.title || payload.titleBig || '').trim();
  const text = (payload.text || payload.bigText || payload.subText || payload.summaryText || '').trim();
  const combined = `${title} ${text}`.trim();

  if (!combined) return null;

  // 1. Extração do valor em centavos
  const amountCents = extractAmountCents(combined);
  if (!amountCents || amountCents <= 0) {
    return null; // Não é uma notificação de transação financeira
  }

  // 2. Detecção de Tipo (EXPENSE ou INCOME)
  const isIncome = /(?:recebeu|recebido|pix recebido|transferência recebida|estorno|depósito|crédito recebido)/i.test(combined);
  const type = isIncome ? 'INCOME' : 'EXPENSE';

  // 3. Extração dos 4 dígitos do cartão (se houver)
  const lastFourDigits = extractCardDigits(combined);

  // 4. Extração do estabelecimento / descrição
  const description = extractDescription(title, text, combined, isIncome);

  // 5. Categoria sugerida
  const suggestedCategoryName = guessCategory(description, combined);

  return {
    amountCents,
    type,
    description,
    lastFourDigits,
    suggestedCategoryName,
    rawText: combined,
    app: payload.app || 'unknown',
    timestamp: new Date().toISOString(),
  };
}

function extractAmountCents(text) {
  // Procura por R$ 1.250,50 ou R$ 45,90 ou 45,90
  const match = text.match(/(?:R\$\s*|BRL\s*)([\d\.]+,\d{2})/i) ||
                text.match(/\b([\d\.]+,\d{2})\b/);

  if (!match) return null;

  const cleanNumber = match[1].replace(/\./g, '').replace(',', '');
  const cents = parseInt(cleanNumber, 10);
  return isNaN(cents) ? null : cents;
}

function extractCardDigits(text) {
  const match = text.match(/(?:final|••••|\*\*\*\*|terminad[oa] em)\s*(\d{4})\b/i) ||
                text.match(/(?:cartão|card)\s*(?:••••|\*\*\*\*|\s)*(\d{4})\b/i);

  return match ? match[1] : null;
}

function extractDescription(title, text, combined, isIncome) {
  if (isIncome) {
    const senderMatch = text.match(/(?:de|por)\s+([A-Za-zÀ-ÿ\s]{3,35})(?:\s+via|\s+no|\s+em|\.|$)/i);
    if (senderMatch && senderMatch[1]) {
      return `Pix de ${senderMatch[1].trim()}`;
    }
    return 'Recebimento Pix';
  }

  const isGeneric = !title || GENERIC_TITLES.some((g) => title.toLowerCase().trim() === g || title.toLowerCase().startsWith(g));

  if (!isGeneric && title.length >= 2 && !title.includes('R$')) {
    return cleanMerchantName(title);
  }

  // Tenta extrair padrões de texto:
  // "R$ 45,50 pago para Posto Shell com Mastercard"
  // "Compra de R$ 32,50 no McDonald's"
  // "Você pagou R$ 18,00 em Padaria Central"
  const patterns = [
    /(?:pago para|pago em|pago no|pago na)\s+([^,•\d]+?)(?:\s+(?:com|no|na|final|••••|\*\*\*\*|\.|$))/i,
    /(?:compra em|compra no|compra na|compra de R\$\s*[\d\.,]+\s+(?:em|no|na|para))\s+([^,•\d]+?)(?:\s+(?:aprovada|com|final|••••|\*\*\*\*|\.|$))/i,
    /(?:você pagou|você gastou)\s+R\$\s*[\d\.,]+\s+(?:para|em|no|na)\s+([^,•\d]+?)(?:\s+(?:com|no|débito|crédito|final|\.|$))/i,
    /(?:em|para|no|na)\s+([^,•\d]{3,35})(?:\s+(?:com|final|••••|\*\*\*\*|\.|$))/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleaned = cleanMerchantName(match[1]);
      if (cleaned.length >= 2) {
        return cleaned;
      }
    }
  }

  return 'Compra com Cartão';
}

function cleanMerchantName(raw) {
  return raw
    .replace(/^(para|em|no|na)\s+/i, '')
    .replace(/\s+(com|final|cartão|visa|mastercard|elo|débito|crédito|aprovada).*$/i, '')
    .replace(/[\.\,\;\:\-\_]+$/, '')
    .trim();
}

function guessCategory(merchant, fullText) {
  const m = `${merchant} ${fullText}`.toLowerCase();

  const categories = {
    'Alimentação': ['mercado', 'supermercado', 'padaria', 'restaurante', 'lanchonete', 'ifood', 'burger', 'pizza', 'café', 'cafe', 'bar', 'açougue', 'acougue', 'hortifruti', 'mcdonald', 'outback', 'subway', 'panificadora', 'adega', 'carrefour', 'extra', 'assai', 'atacadao'],
    'Transporte': ['posto', 'combustível', 'combustivel', 'gasolina', 'etanol', 'uber', '99', 'estacionamento', 'pedágio', 'pedagio', 'shell', 'ipiranga', 'petrobras', 'auto posto', 'estapar', 'metrô', 'onibus'],
    'Saúde': ['farmácia', 'farmacia', 'drogaria', 'médico', 'medico', 'hospital', 'laboratório', 'laboratorio', 'clínica', 'clinica', 'raia', 'drogasil', 'pacheco', 'ultrafarma', 'panvel', 'consulta', 'dentista'],
    'Moradia': ['condomínio', 'condominio', 'aluguel', 'energia', 'enel', 'sabesp', 'copel', 'cemig', 'internet', 'claro', 'vivo', 'tim', 'gás', 'gas'],
    'Lazer': ['cinema', 'teatro', 'show', 'ingresso', 'steam', 'playstation', 'xbox', 'netflix', 'spotify', 'livraria', 'parque', 'clube', 'viagem', 'hotel'],
    'Educação': ['curso', 'escola', 'faculdade', 'universidade', 'udemy', 'alura', 'livro'],
  };

  for (const [categoryName, keywords] of Object.entries(categories)) {
    if (keywords.some((k) => m.includes(k))) {
      return categoryName;
    }
  }

  return 'Outras Despesas';
}
