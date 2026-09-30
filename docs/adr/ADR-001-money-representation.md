# ADR-001: Representação Numérica de Valores Monetários

## Status
Aprovado

## Contexto
Aplicações financeiras que utilizam números de ponto flutuante binário (`float` ou `double`, IEEE 754) sofrem com erros acumulativos de arredondamento. Por exemplo, em JavaScript:
```javascript
0.1 + 0.2 === 0.30000000000000004
```
Em relatórios de consolidação financeira, extratos e conciliação de faturas, qualquer divergência de fração de centavo corrompe a integridade contábil e a confiança do usuário.

## Decisão
1. **Armazenamento no Banco de Dados**:
   Todos os valores monetários serão armazenados em **centavos inteiros** utilizando o tipo `BIGINT` (ou `INTEGER` para SQLite), nunca `FLOAT` ou `DOUBLE`.
   Exemplo: R$ 1.250,90 é persistido como `125090`.
2. **Camada de Domínio**:
   Criação de um Value Object imutável `Money` que encapsula a quantidade em centavos e a moeda base (BRL), fornecendo métodos aritméticos determinísticos:
   - `add(other: Money): Money`
   - `subtract(other: Money): Money`
   - `multiply(factor: number): Money`
   - `percentage(rate: number): Money`
   - `formatBRL(): string`
   - `toCents(): bigint`
3. **Serialização de API**:
   Os endpoints REST trafegam valores como inteiros `amount_cents` ou strings formatadas quando puramente visuais, prevenindo coerção imperfeita de floats no parse JSON do cliente.

## Consequências
- **Positivas**: Precisão de 100% em qualquer cálculo financeiro; compatibilidade com qualquer banco SQL; ausência de erros de arredondamento; alta performance em comparações e agregações (`SUM`).
- **Negativas**: O desenvolvedor precisa lembrar que o valor base está em centavos, o que é mitigado pelo uso obrigatório do tipo tipado `Money`.
