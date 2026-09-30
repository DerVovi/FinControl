# Dicionário e Modelagem do Banco de Dados (PostgreSQL / SQLite)

## 1. Princípios de Modelagem Financeira

1. **Precisão Absoluta**: Nenhuma coluna monetária usa `FLOAT` ou `DOUBLE`. Todos os valores são representados em centavos como `BIGINT` (ou `INTEGER`).
2. **Isolamento Multi-tenant Lógico**: Todas as entidades pertencem a um `user_id`, garantindo que filtros de tenant sejam aplicados em todas as operações de leitura e escrita.
3. **Imutabilidade e Auditoria**: Transações confirmadas registram data de criação, atualização e referências cruzadas.

## 2. Tabelas do Sistema

### `users`
Armazena a identidade dos titulares de conta.
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | UUID / String | PK | Identificador único do usuário |
| `email` | String | UNIQUE, NOT NULL | E-mail do usuário (normalizado em minúsculas) |
| `password_hash`| String | NOT NULL | Hash seguro da senha gerado com Bcrypt (custo 12) |
| `full_name` | String | NOT NULL | Nome de exibição do usuário |
| `base_currency`| String | DEFAULT 'BRL' | Moeda base de exibição e cálculo |
| `created_at` | DateTime | DEFAULT now() | Data/hora de cadastro |
| `updated_at` | DateTime | NOT NULL | Data/hora da última alteração |
| `deleted_at` | DateTime | NULL | Marcação de exclusão lógica (LGPD) |

### `accounts`
Contas bancárias, carteiras físicas ou contas de investimento.
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | UUID / String | PK | Identificador da conta |
| `user_id` | UUID / String | FK `users.id`, INDEX | Dono da conta |
| `name` | String | NOT NULL | Ex: "Nubank", "Itaú", "Carteira" |
| `type` | String | NOT NULL | `CHECKING`, `SAVINGS`, `DIGITAL`, `WALLET`, `INVESTMENT` |
| `initial_balance_cents` | BIGINT | DEFAULT 0 | Saldo inicial cadastrado na abertura |
| `current_balance_cents` | BIGINT | DEFAULT 0 | Saldo consolidado após transações |
| `color` | String | NULL | Cor hexadecimal para identificação visual |
| `status` | String | DEFAULT 'ACTIVE' | `ACTIVE` ou `ARCHIVED` |

### `categories`
Classificação de receitas e despesas.
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | UUID / String | PK | Identificador da categoria |
| `user_id` | UUID / String | FK `users.id`, INDEX, NULL | Proprietário (NULL se for global de sistema) |
| `name` | String | NOT NULL | Ex: "Alimentação", "Salário" |
| `type` | String | NOT NULL | `INCOME` ou `EXPENSE` |
| `icon` | String | NULL | Nome do ícone Lucide correspondente |
| `color` | String | NULL | Cor de destaque da categoria |
| `is_system` | Boolean | DEFAULT false | Flag de categoria padrão |

### `refresh_tokens`
Tokens de longa duração para renovação de sessão.
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | UUID / String | PK | Identificador do token |
| `user_id` | UUID / String | FK `users.id`, INDEX | Usuário associado |
| `token_hash` | String | UNIQUE, NOT NULL | Hash SHA-256 do token bruto |
| `expires_at` | DateTime | NOT NULL | Data de expiração (7 dias) |
| `revoked` | Boolean | DEFAULT false | Indica se foi revogado |

### `password_reset_tokens`
Tokens de recuperação de senha por uso único.
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | UUID / String | PK | Identificador da solicitação |
| `user_id` | UUID / String | FK `users.id`, INDEX | Usuário solicitante |
| `token_hash` | String | UNIQUE, NOT NULL | Hash SHA-256 do token de recuperação |
| `expires_at` | DateTime | NOT NULL | Validade de 1 hora |
| `used` | Boolean | DEFAULT false | Marcação de uso único |
