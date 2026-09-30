# Especificação da API RESTful (FinControl v1)

Todos os endpoints respondem em JSON e utilizam o prefixo `/api/v1`.

A documentação interativa Swagger UI está disponível no servidor em execução em:
`http://localhost:3333/docs`

---

## 1. Autenticação

### `POST /api/v1/auth/register`
Cadastra um novo usuário e inicializa automaticamente as categorias padrão de receitas e despesas.

**Corpo da Requisição**:
```json
{
  "fullName": "Victor Finanças",
  "email": "victor@exemplo.com",
  "password": "SenhaSegura123!"
}
```

**Resposta de Sucesso (201 Created)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-v4",
      "email": "victor@exemplo.com",
      "fullName": "Victor Finanças",
      "baseCurrency": "BRL",
      "createdAt": "2026-09-27T22:00:00.000Z"
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "4a7f..."
  }
}
```

---

### `POST /api/v1/auth/login`
Autentica o usuário e define cookies HttpOnly de sessão.

**Corpo da Requisição**:
```json
{
  "email": "victor@exemplo.com",
  "password": "SenhaSegura123!"
}
```

**Resposta de Sucesso (200 OK)**:
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

---

### `POST /api/v1/auth/logout`
Encerra a sessão e limpa os cookies HttpOnly.

---

### `GET /api/v1/auth/me`
*Requer Cabeçalho `Authorization: Bearer <token>` ou Cookie HttpOnly.*

**Resposta de Sucesso (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "email": "victor@exemplo.com",
    "fullName": "Victor Finanças",
    "baseCurrency": "BRL",
    "createdAt": "2026-09-27T22:00:00.000Z",
    "_count": {
      "accounts": 0,
      "categories": 15
    }
  }
}
```

---

### `POST /api/v1/auth/forgot-password`
Solicita recuperação de senha via e-mail.

---

### `POST /api/v1/auth/reset-password`
Redefine a senha com base em um token de recuperação de uso único.

---

## 2. Sistema & Integridade

### `GET /api/v1/health`
Retorna a saúde do serviço e tempo em execução.
```json
{
  "status": "healthy",
  "service": "fincontrol-api",
  "timestamp": "2026-09-27T22:50:00.000Z",
  "uptime": 120.5
}
```

---

## 3. Contas & Categorias

- `GET /api/v1/accounts`: Lista todas as contas ativas do usuário com saldo formatado.
- `POST /api/v1/accounts`: Cadastra uma nova conta bancária ou carteira (`name`, `type`, `initialBalanceCents`, `color`).
- `PATCH /api/v1/accounts/:id/archive`: Arquiva a conta preservando histórico contábil.
- `DELETE /api/v1/accounts/:id`: Exclui a conta se não possuir transações vinculadas.
- `GET /api/v1/categories`: Lista categorias de receitas e despesas.
- `POST /api/v1/categories`: Cria nova categoria personalizada.

---

## 4. Transações & Dashboard

- `GET /api/v1/transactions`: Lista o extrato contábil completo com filtros.
- `POST /api/v1/transactions`: Lança receita, despesa ou transferência com atualização atômica de saldo.
- `DELETE /api/v1/transactions/:id`: Exclui a transação e estorna o saldo atomicamente.
- `GET /api/v1/dashboard`: Retorna patrimônio líquido, saldo consolidado, receitas e despesas do mês e distribuição proporcional.

---

## 5. Cartões de Crédito & Faturas

- `GET /api/v1/cards`: Lista cartões cadastrados com limites (total, comprometido, disponível) e fatura atual.
- `POST /api/v1/cards`: Cadastra novo cartão (`name`, `limitCents`, `closingDay`, `dueDay`, `last4Digits`, `color`).
- `POST /api/v1/cards/:id/purchases`: Registra compra no cartão com parcelamento exato (1x a 24x).
- `GET /api/v1/invoices/:id`: Retorna detalhes e itens de uma fatura com indicação de parcelas K/N.
- `POST /api/v1/invoices/:id/pay`: Quita fatura com débito em conta bancária sem duplicar despesas.

---

## 6. Planejamento Financeiro

- `GET /api/v1/recurring`: Lista transações recorrentes e projeção de vencimentos nos próximos 60 dias.
- `POST /api/v1/recurring`: Cadastra transação recorrente diária, semanal, mensal ou anual.
- `GET /api/v1/budgets`: Lista orçamentos do mês com consumo real e status (`OK`, `WARNING`, `REACHED`, `EXCEEDED`).
- `POST /api/v1/budgets`: Define ou atualiza o teto orçamentário mensal para uma categoria.
- `GET /api/v1/goals`: Lista metas com valor acumulado, % de progresso e aporte mensal sugerido.
- `POST /api/v1/goals`: Cadastra nova meta financeira com prazo opcional.
- `POST /api/v1/goals/:id/contribute`: Realiza aporte financeiro debitando atomicamente de uma conta bancária.

---

## 7. Relatórios & Exportação

- `GET /api/v1/reports/monthly?month=X&year=Y`: Demonstrativo de resultado do exercício (DRE) com taxa de poupança, composição de gastos e histórico de 6 meses.
- `GET /api/v1/reports/export?format=csv`: Exporta extrato financeiro filtrado em CSV padrão RFC 4180 com codificação UTF-8 BOM e proteção contra injeção de fórmulas.

---

## 8. Integrações & Webhooks Mobile (Carteira do Google)

- `POST /api/v1/integrations/webhook/wallet`: Webhook público protegido por cabeçalho `X-Api-Key`. Recebe payload de notificação (`title`, `text`, `raw`), extrai valor em centavos (`BigInt`), estabelecimento e final do cartão (`lastFourDigits`), com deduplicação de 5 minutos.
- `GET /api/v1/integrations/webhook/config`: Retorna status da integração e chave mascarada para o usuário autenticado.
- `POST /api/v1/integrations/webhook/regenerate`: Revoga a chave anterior e emite nova chave criptográfica de API.
- `POST /api/v1/integrations/webhook/simulate`: Dispara simulação imediata com feedback contábil no frontend.


