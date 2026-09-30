/**
 * Value Object para manipulação exata de valores monetários em BRL (Real Brasileiro).
 * 
 * REGRA FUNDAMENTAL: NUNCA utiliza float ou double para armazenamento ou aritmética contábil.
 * Todos os valores são representados internamente como centavos inteiros (bigint).
 * Exemplo: R$ 10,50 é armazenado como 1050n.
 */
export class Money {
  private readonly cents: bigint;
  private readonly currency: string;

  private constructor(cents: bigint, currency = 'BRL') {
    this.cents = cents;
    this.currency = currency;
  }

  /**
   * Cria uma instância de Money a partir de centavos inteiros (bigint ou number inteiro).
   */
  public static fromCents(cents: bigint | number, currency = 'BRL'): Money {
    const bigintCents = typeof cents === 'bigint' ? cents : BigInt(Math.trunc(cents));
    return new Money(bigintCents, currency);
  }

  /**
   * Cria uma instância de Money a partir de uma string ou número formatado em Reais.
   * Converte determinísticamente para centavos sem usar float aritmético.
   * Ex: "10,50" -> 1050n, "1250.75" -> 125075n
   */
  public static fromString(valueStr: string, currency = 'BRL'): Money {
    const cleaned = valueStr.trim().replace(/^R\$\s?/, '').replace(/\s/g, '');
    const isNegative = cleaned.startsWith('-');
    const unsigned = isNegative ? cleaned.slice(1) : cleaned;

    // Normaliza separador decimal (vírgula ou ponto)
    let parts: string[];
    if (unsigned.includes(',')) {
      // Formato brasileiro: 1.250,50
      const withoutThousands = unsigned.replace(/\./g, '');
      parts = withoutThousands.split(',');
    } else if (unsigned.includes('.')) {
      parts = unsigned.split('.');
    } else {
      parts = [unsigned, '00'];
    }

    const integerPart = parts[0] || '0';
    let decimalPart = parts[1] || '00';
    if (decimalPart.length === 1) decimalPart += '0';
    if (decimalPart.length > 2) decimalPart = decimalPart.slice(0, 2);

    const totalCents = BigInt(integerPart) * 100n + BigInt(decimalPart);
    return new Money(isNegative ? -totalCents : totalCents, currency);
  }

  /**
   * Retorna uma instância de Money com valor zero.
   */
  public static zero(currency = 'BRL'): Money {
    return new Money(0n, currency);
  }

  /**
   * Adiciona outro valor monetário.
   */
  public add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.cents + other.cents, this.currency);
  }

  /**
   * Subtrai outro valor monetário.
   */
  public subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.cents - other.cents, this.currency);
  }

  /**
   * Multiplica o valor monetário por um inteiro determinístico.
   */
  public multiply(multiplier: number | bigint): Money {
    const factor = typeof multiplier === 'bigint' ? multiplier : BigInt(Math.trunc(multiplier));
    return new Money(this.cents * factor, this.currency);
  }

  /**
   * Calcula uma porcentagem inteira ou fracionária (em pontos base ou com precisão de 2 casas decimais).
   * ratePercent: número como 20 para 20%, ou 15.5 para 15,5%.
   */
  public percentage(ratePercent: number): Money {
    // Multiplica por 100 para capturar 2 casas de precisão percentual: 15.5% -> 1550 pontos base
    const basisPoints = BigInt(Math.round(ratePercent * 100));
    // (cents * basisPoints) / 10000n com arredondamento padrão bancário
    const result = (this.cents * basisPoints + 5000n) / 10000n;
    return new Money(result, this.currency);
  }

  /**
   * Retorna o valor bruto em centavos (bigint).
   */
  public toCents(): bigint {
    return this.cents;
  }

  /**
   * Retorna o valor bruto em centavos como number (apenas para JSON seguro se < 2^53).
   */
  public toCentsNumber(): number {
    return Number(this.cents);
  }

  /**
   * Formata para padrão monetário brasileiro (R$ 1.250,50).
   */
  public formatBRL(): string {
    const isNegative = this.cents < 0n;
    const absCents = isNegative ? -this.cents : this.cents;
    const integers = absCents / 100n;
    const decimals = absCents % 100n;
    const decStr = decimals < 10n ? `0${decimals}` : decimals.toString();

    // Formata milhares com ponto
    const intFormatted = integers.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const sign = isNegative ? '-' : '';
    return `${sign}R$ ${intFormatted},${decStr}`;
  }

  public isZero(): boolean {
    return this.cents === 0n;
  }

  public isPositive(): boolean {
    return this.cents > 0n;
  }

  public isNegative(): boolean {
    return this.cents < 0n;
  }

  public greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.cents > other.cents;
  }

  public lessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.cents < other.cents;
  }

  public equals(other: Money): boolean {
    return this.cents === other.cents && this.currency === other.currency;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Moedas incompatíveis para cálculo: ${this.currency} e ${other.currency}`);
    }
  }
}
