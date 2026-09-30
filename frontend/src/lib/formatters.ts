export function formatMoney(cents: number | string | bigint): string {
  const num = typeof cents === 'bigint' ? Number(cents) : typeof cents === 'string' ? parseInt(cents, 10) : cents;
  if (isNaN(num)) return 'R$ 0,00';
  const val = num / 100;
  return val.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function parseMoneyToCents(amountStr: string): string {
  const cleanVal = amountStr.replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(cleanVal);
  if (isNaN(num) || num <= 0) {
    throw new Error('Informe um valor monetário positivo válido.');
  }
  return Math.round(num * 100).toString();
}
