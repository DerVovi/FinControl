/**
 * Utilitário de máscara de moeda brasileira (R$)
 * Completa automaticamente os centavos conforme o usuário digita (padrão bancos / ATM).
 */

export function formatCentsToDisplay(cents) {
  const numeric = Math.max(0, Math.floor(Number(cents) || 0));
  const reais = Math.floor(numeric / 100);
  const centavos = String(numeric % 100).padStart(2, '0');
  const formattedReais = reais.toLocaleString('pt-BR');
  return `${formattedReais},${centavos}`;
}

export function handleCurrencyInputChange(text) {
  // Extrai apenas os dígitos
  const cleanDigits = String(text || '').replace(/\D/g, '');
  if (!cleanDigits || cleanDigits === '0') {
    return { cents: 0, formatted: '0,00' };
  }
  // Limita a 11 dígitos para evitar overflow
  const trimmed = cleanDigits.slice(0, 11);
  const cents = parseInt(trimmed, 10);
  return { cents, formatted: formatCentsToDisplay(cents) };
}

export function parseFormattedToCents(formattedStr) {
  if (!formattedStr) return 0;
  const cleanDigits = String(formattedStr).replace(/\D/g, '');
  return cleanDigits ? parseInt(cleanDigits, 10) : 0;
}
