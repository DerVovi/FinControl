# FinControl 💰

> Sistema robusto, determinístico e auditável de gestão financeira pessoal.  
> Responde com precisão matemática absoluta às 3 perguntas essenciais:  
> **1. Quanto dinheiro eu tenho?**  
> **2. Quanto posso gastar?**  
> **3. Para onde meu dinheiro está indo?**

---

## 🌟 Principais Funcionalidades

- **Patrimônio Líquido & Saldo Consolidado**: Visão unificada de contas correntes, investimentos, poupança e carteiras físicas.
- **Transações Atômicas & Conciliação**: Lançamento de receitas, despesas e transferências com atualização de saldos em transação ACID e rollback automático.
- **Não-Duplicação de Despesas**: Transferências entre contas e pagamentos de fatura de cartão de crédito (`INVOICE_PAYMENT`) nunca são computados como despesa de consumo no DRE mensal.
- **Cartões de Crédito & Faturas Inteligentes**:
  - Motor de faturas (`CardInvoiceEngine`) com base em dia de corte e vencimento.
  - Parcelamento em até 24x com absorção exata de restos de centavos na 1ª parcela ($\sum \text{parcelas} \equiv \text{total}$).
  - Limite total, comprometido e disponível recalculados em tempo real.
- **Planejamento Orçamentário**:
  - Tetos por categoria com alertas visuais dinâmicos: **OK** (<80%), **ALERTA** (80–99%), **ATINGIDO** (100%), **EXCEDIDO** (>100%).
- **Metas Financeiras**:
  - Acompanhamento percentual de progresso e sugestão de aporte mensal para atingir objetivos.
  - Aportes vinculados a débitos atômicos em conta bancária.
- **Transações Recorrentes**:
  - Projeção de fluxo de caixa em janela móvel de **60 dias** (diária, semanal, mensal ou anual).
- **DRE Pessoal & Relatórios**:
  - Demonstrativo de resultado do exercício mensal com cálculo de Taxa de Poupança (*Savings Rate*).
  - Evolução histórica de 6 meses (Receitas vs Despesas vs Balanço Líquido).
  - Exportação de extrato em CSV padrão RFC 4180 com codificação UTF-8 BOM para Microsoft Excel e sanitização contra injeção de fórmulas (DDE).

---

## 🛡️ Garantias de Arquitetura & Segurança (Fase 6)

1. **Política Zero-Float**: Proibição estrita de números de ponto flutuante (`float`/`double`). Toda quantia monetária é representada como inteiro `BigInt` de centavos manipulada pelo Value Object imutável `Money`.
2. **Defesa Anti-IDOR Rigorosa**: Toda mutação ou consulta valida a propriedade do recurso em relação ao `userId` do token validado.
3. **Concorrência Segura**: Mutação de saldos protegida contra *race conditions* via transações de banco com consistência serializada.
4. **Proteção de Dados em Trânsito & Cache**:
   - Cabeçalhos `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`.
   - Rotas de API financeira com `Cache-Control: no-store, no-cache, must-revalidate, private` impedindo cache em discos compartilhados.
5. **Autenticação Segura**:
   - Hashing de senhas com **Bcrypt** (custo 12).
   - Access Token JWT de curta duração (15 min) e Refresh Token rotativo persistido em cookie protegido `HttpOnly; SameSite=Lax`.

---

## 🚀 Como Executar

### Opção 1: Execução em Produção via Docker Compose (Recomendado)

```bash
# 1. Clone e configure o ambiente
cp .env.example .env

# 2. Inicie a stack completa (Backend + Frontend Nginx + SQLite)
docker compose up -d --build

# 3. Acesse no navegador
# Frontend SPA: http://localhost:80
# API Swagger:  http://localhost:3333/docs
# Healthcheck:  http://localhost:3333/api/v1/health
```

### Opção 2: Desenvolvimento Local

#### Pré-requisitos
- Node.js 22+ ou 24+
- npm 10+

```bash
# 1. Configurar e rodar Backend
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev

# 2. Em outro terminal, rodar Frontend
cd ../frontend
npm install
npm run dev
```

- **Frontend Dev**: `http://localhost:5173`
- **Backend API**: `http://localhost:3333`
- **Swagger Docs**: `http://localhost:3333/docs`

---

## 🧪 Testes Automatizados

O sistema conta com 58 testes automatizados (unitários, integração e segurança) com 100% de taxa de aprovação:

```bash
cd backend
npm test
```

Para rodar especificamente a suíte de hardening e segurança:
```bash
npx vitest run src/presentation/routes/security-hardening.test.ts
```

---

## 📚 Documentação Técnica Completa

- [Arquitetura do Sistema & Motores de Domínio](file:///C:/Users/Victor/fincontrol/docs/architecture.md)
- [Diretrizes de Segurança & Hardening](file:///C:/Users/Victor/fincontrol/docs/security.md)
- [Manual de Operações, Backups & Manutenção](file:///C:/Users/Victor/fincontrol/docs/operations.md)
- [Especificação da API RESTful](file:///C:/Users/Victor/fincontrol/docs/api.md)
- [Modelo de Banco de Dados](file:///C:/Users/Victor/fincontrol/docs/database.md)
- [Histórico de Mudanças (Changelog)](file:///C:/Users/Victor/fincontrol/CHANGELOG.md)

---

## 📄 Licença

Proprietário. Todos os direitos reservados.
