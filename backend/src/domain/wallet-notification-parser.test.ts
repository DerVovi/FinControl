import { describe, it, expect } from 'vitest';
import { WalletNotificationParser } from './services/wallet-notification-parser.js';

describe('WalletNotificationParser (Domínio Puro)', () => {
  it('deve extrair valor em centavos, estabelecimento e cartão a partir de título e texto da Carteira do Google', () => {
    const parsed = WalletNotificationParser.parse({
      title: 'Padaria Central',
      text: 'R$ 24,90 pago com Visa final 1234'
    });

    expect(parsed.amountCents).toBe(2490n);
    expect(parsed.description).toBe('Padaria Central');
    expect(parsed.lastFourDigits).toBe('1234');
    expect(parsed.suggestedCategoryType).toBe('ALIMENTACAO');
  });

  it('deve processar notificação com título genérico "Carteira do Google"', () => {
    const parsed = WalletNotificationParser.parse({
      title: 'Carteira do Google',
      text: 'R$ 45,50 pago para Posto Shell com Mastercard final 8821'
    });

    expect(parsed.amountCents).toBe(4550n);
    expect(parsed.description).toBe('Posto Shell');
    expect(parsed.lastFourDigits).toBe('8821');
    expect(parsed.suggestedCategoryType).toBe('TRANSPORTE');
  });

  it('deve processar valores altos com separador de milhar (ex: R$ 1.250,00)', () => {
    const parsed = WalletNotificationParser.parse({
      title: 'Drogaria Pacheco',
      text: 'Você pagou R$ 1.250,00 com cartão final 9900'
    });

    expect(parsed.amountCents).toBe(125000n);
    expect(parsed.description).toBe('Drogaria Pacheco');
    expect(parsed.lastFourDigits).toBe('9900');
    expect(parsed.suggestedCategoryType).toBe('SAUDE');
  });

  it('deve extrair informações de payload apenas com texto bruto', () => {
    const parsed = WalletNotificationParser.parse({
      raw: 'R$ 38,00 pago em Restaurante Sabor de Casa com Nubank •••• 4455'
    });

    expect(parsed.amountCents).toBe(3800n);
    expect(parsed.description).toBe('Restaurante Sabor de Casa');
    expect(parsed.lastFourDigits).toBe('4455');
    expect(parsed.suggestedCategoryType).toBe('ALIMENTACAO');
  });

  it('deve lançar erro se o texto estiver vazio ou sem valor monetário', () => {
    expect(() => WalletNotificationParser.parse({ text: 'Notificação sem valor algum' }))
      .toThrow('Não foi possível identificar o valor da transação na notificação');
  });
});
