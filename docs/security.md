# Arquitetura de Segurança & Hardening — FinControl

O **FinControl** foi concebido com uma postura de defesa em profundidade (*Defense in Depth*), garantindo integridade contábil matemática absoluta, isolamento multi-inquilino rígido e proteção contra as principais vulnerabilidades modernas (OWASP Top 10 e CWE).

---

## 1. Integridade Contábil: Política Zero-Float

### 1.1 O Risco de Ponto Flutuante (`float`/`double`)
Na linguagem JavaScript e na maioria dos bancos relacionais, números de ponto flutuante padrão IEEE 754 sofrem de imprecisão cumulativa (ex: `0.1 + 0.2 = 0.30000000000000004`). Em sistemas financeiros, essa discrepância gera erros de centavos em saldos consolidados e reconciliações contábeis.

### 1.2 Implementação do FinControl
- **Banco de Dados**: Todas as grandezas monetárias são persistidas estritamente como inteiros `BigInt` representando centavos (`amountCents`, `initialBalanceCents`, `currentBalanceCents`, `totalCents`, etc.).
- **Camada de Domínio**: Toda operação matemática financeira é encapsulada no Value Object imutável [`Money`](file:///C:/Users/Victor/fincontrol/backend/src/domain/value-objects/money.ts), que opera apenas com aritmética inteira.
- **Divisão Exata de Parcelas**: O algoritmo de parcelamento absorve sobras indivisíveis de centavos na primeira parcela, garantindo que a soma estrita das $N$ parcelas seja sempre 100% idêntica ao valor total original:
  $$\sum_{k=1}^{N} \text{parcela}_k \equiv \text{totalAmountCents}$$

---

## 2. Isolamento Multi-Tenant & Prevenção Anti-IDOR

### 2.1 O Modelo de Ameaça (Insecure Direct Object Reference)
Em sistemas SaaS ou multi-usuário, um invasor autenticado pode tentar modificar ou inspecionar recursos pertencentes a outro usuário manipulando identificadores UUID nos parâmetros de requisição (`accountId`, `categoryId`, `cardId`, `invoiceId`, `transactionId`, `budgetId`, `goalId`).

### 2.2 Camada de Defesa
1. **Contexto Criptográfico Obrigatório**: Todas as rotas autenticadas injetam o `userId` extraído diretamente da assinatura do Access Token validado pelo [`authMiddleware`](file:///C:/Users/Victor/fincontrol/backend/src/presentation/middlewares/auth.middleware.ts).
2. **Validação de Propriedade em Todos os Casos de Uso**:
   - `CreateTransactionUseCase`: Valida se a conta informada pertence ao usuário logado. Se houver categoria, valida se a categoria pertence ao usuário ou se é de sistema (`isSystem = true`). Se houver conta destino (transferência), valida se ela também pertence ao mesmo usuário.
   - `CreateCardPurchaseUseCase`: Valida se o cartão de crédito e a categoria pertencem ao usuário logado antes de criar qualquer lançamento ou fatura.
   - `SetBudgetUseCase`: Rejeita com `404 Not Found` caso o usuário tente associar um orçamento a uma categoria privada de outro usuário.
   - `PayInvoiceUseCase`, `ContributeGoalUseCase`, `ArchiveAccountUseCase`, etc.: Todas as operações exigem correspondência estrita `where: { id, userId }`.

---

## 3. Gestão de Credenciais & Sessões

1. **Hashing de Senhas**:
   - Algoritmo **Bcrypt** com fator de trabalho `SALT_ROUNDS = 12`.
   - Senhas em texto claro são validadas com regras estritas (mínimo de 8 caracteres, letras maiúsculas, minúsculas e números) e jamais persistem ou são registradas em logs.
2. **Tokens com Princípio do Menor Privilégio**:
   - **Access Token**: Assinado com HMAC-SHA256, expiração em 15 minutos.
   - **Refresh Token**: String criptograficamente aleatória de 40 bytes gerada via `crypto.randomBytes(40)`. Armazenado no banco com hash SHA-256 (`tokenHash`), data de expiração de 7 dias e flag de revogação.
   - **Cookies HttpOnly**: O refresh token é transportado exclusivamente em cookies com as flags `HttpOnly; SameSite=Lax; Path=/api/v1/auth/refresh`, prevenindo exfiltração por ataques XSS.
3. **Revogação Imediata**:
   - Ao alterar senha ou chamar logout, todos os tokens ativos do usuário são invalidados no banco.

---

## 4. Concorrência & Atomicidade de Saldos (Race Conditions)

### 4.1 Cenário de Concorrência
Múltiplas requisições simultâneas debitando ou creditando a mesma conta bancária poderiam causar perda de atualização (*Lost Update*) caso a leitura e escrita do saldo ocorressem fora de um bloco atômico.

### 4.2 Mitigação com Transações ACID
Todas as operações de atualização de saldo ([`CreateTransactionUseCase`](file:///C:/Users/Victor/fincontrol/backend/src/application/use-cases/create-transaction.use-case.ts), [`DeleteTransactionUseCase`](file:///C:/Users/Victor/fincontrol/backend/src/application/use-cases/delete-transaction.use-case.ts), [`PayInvoiceUseCase`](file:///C:/Users/Victor/fincontrol/backend/src/application/use-cases/pay-invoice.use-case.ts)) são executadas em bloco `prisma.$transaction`. O saldo é recalculado ou ajustado deterministicamente dentro da mesma transação, garantindo consistência mesmo sob estresse simultâneo concorrente.

---

## 5. Cabeçalhos HTTP de Segurança & Proteção de Dados Sensíveis

Implementado no gancho global `onSend` do Fastify ([`app.ts`](file:///C:/Users/Victor/fincontrol/backend/src/presentation/app.ts)):

1. **`X-Content-Type-Options: nosniff`**: Impede que navegadores executem detecção de tipo MIME (MIME-sniffing).
2. **`X-Frame-Options: DENY`**: Bloqueia renderização do sistema dentro de `iframe`, `frame` ou `embed`, neutralizando ataques de *Clickjacking*.
3. **`Strict-Transport-Security: max-age=31536000; includeSubDomains`**: Força comunicações exclusivamente sob HTTPS.
4. **`Referrer-Policy: strict-origin-when-cross-origin`**: Protege vazamento de caminhos de URL em requisições de saída.
5. **Prevenção de Cache de Dados Financeiros**:
   - Em todas as rotas `/api/v1`, são injetados os cabeçalhos:
     ```http
     Cache-Control: no-store, no-cache, must-revalidate, private
     Pragma: no-cache
     Expires: 0
     ```
   - Impede que navegadores em computadores compartilhados ou servidores proxy intermediários gravem em disco extratos bancários, faturas ou saldos da conta do usuário.

---

## 6. Proteção Contra CSV Formula Injection (DDE)

### 6.1 Vulnerabilidade de Injeção em Planilhas
Ao exportar extratos bancários para CSV, usuários maliciosos poderiam cadastrar descrições contendo comandos executáveis de planilhas como Excel ou LibreOffice (iniciados com `=`, `+`, `-`, `@`, `\t`, `\r`), resultando em execução arbitrária de código (DDE) na máquina da vítima que abrir o arquivo exportado.

### 6.2 Mitigação Implementada no FinControl
No [`ExportTransactionsUseCase`](file:///C:/Users/Victor/fincontrol/backend/src/application/use-cases/export-transactions.use-case.ts):
1. **Sanitização de Células**: Qualquer campo de texto cujo primeiro caractere seja `=`, `+`, `-`, `@`, `\t` ou `\r` é automaticamente prefixado com apóstrofo (`'`), forçando a planilha a interpretá-lo como texto literal inofensivo.
2. **Escape RFC 4180**: Aspas duplas internas são escapadas (`""`) e os campos são delimitados por ponto e vírgula `;`.
3. **Codificação UTF-8 com BOM (`\uFEFF`)**: Garante compatibilidade imediata com caracteres acentuados no Microsoft Excel em qualquer sistema operacional sem corromper a tabela.

---

## 7. Verificação Automatizada Contínua

O conjunto completo de garantias de segurança é validado automaticamente a cada build na suíte de testes:
- Arquivo de Testes de Hardening: [`security-hardening.test.ts`](file:///C:/Users/Victor/fincontrol/backend/src/presentation/routes/security-hardening.test.ts)
- Cobertura: Tentativas de IDOR em Contas, Categorias, Cartões, Faturas e Orçamentos; Teste de estresse concorrente com 10 transações simultâneas; Inspeção de cabeçalhos de segurança HTTP e no-store cache.
