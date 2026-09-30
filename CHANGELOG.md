# Changelog

Todas as alterações relevantes deste projeto serão documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.1.0] - 2026-09-29
### Adicionado
- **Sprint 8 - Automação Mobile & Carteira do Google (FIN-019 & FIN-020)**:
  - Motor de domínio `WalletNotificationParser` para extração exata de valores (`BigInt` centavos), estabelecimento e final do cartão (`lastFourDigits`) a partir de notificações push da Carteira do Google no Android.
  - Endpoint de Webhook público `POST /api/v1/integrations/webhook/wallet` autenticado com chaves exclusivas de API (`X-Api-Key`).
  - Mapeamento automático para faturas de cartão de crédito correspondentes ou conta bancária ativa.
  - Trava contábil anti-duplicação / idempotência em janela móvel de 5 minutos.
  - Tela no Frontend de "Automação Mobile" com geração de chave, guia passo a passo para o MacroDroid e simulador de testes em tempo real.
  - Suíte de testes unitários e de integração com 69 testes e 100% de sucesso.

## [1.0.0] - 2026-09-28
### Adicionado
- **Sprint 6 - Hardening, Auditoria de Segurança & Concorrência**:
  - Defesas anti-IDOR abrangentes em todas as rotas (Categorias, Contas, Cartões, Faturas, Orçamentos, Metas).
  - Proteção contra Race Conditions em movimentações financeiras concorrentes via transações ACID atômicas.
  - Injeção global de cabeçalhos de segurança HTTP (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`).
  - Política de cabeçalho `Cache-Control: no-store, no-cache, must-revalidate, private` e `Pragma: no-cache` em todos os endpoints de dados financeiros.
  - Sanitização preventiva contra CSV Formula Injection (DDE) na exportação de extratos (`=`, `+`, `-`, `@`).
  - Suíte automatizada de testes de hardening (`security-hardening.test.ts`) totalizando 58 testes com 100% de aprovação.
- **Sprint 7 - Produção & Documentação Final**:
  - Dockerização de produção com builds multi-stage otimizados para Backend (Fastify/Node 22) e Frontend (React 19/Nginx).
  - Orquestração completa via `docker-compose.yml` com persistência de volume SQLite e verificadores de saúde (`healthcheck`).
  - Guia de Operações e Manutenção (`docs/operations.md`) com rotina de hot backup SQLite, recuperação de desastres e troubleshooting.
  - Documentação de Arquitetura (`docs/architecture.md`) e Segurança (`docs/security.md`) atualizadas com detalhes técnicos aprofundados.
  - Template de variáveis de ambiente (`.env.example`) para produção.

## [0.2.0] - 2026-09-28
### Adicionado
- **Sprint 2 - Financeiro Básico**:
  - CRUD de contas financeiras com exclusão segura e arquivamento preventivo.
  - Motor de transações atômicas (Receitas, Despesas, Transferências, Liquidação de Faturas).
  - Regra estrita anti-duplicação: transferências entre contas e pagamentos de fatura não alteram o DRE operacional.
  - Dashboard consolidado com patrimônio líquido, saldo consolidado e extrato auditado.
- **Sprint 3 - Cartões de Crédito & Faturas**:
  - Motor `CardInvoiceEngine` com fechamento (`closingDay`), vencimento (`dueDay`) e melhor dia de compra.
  - Distribuição exata de parcelamentos (1x a 24x) com absorção determinística de resto de centavos na 1ª parcela.
  - Gestão de limite total, disponível e comprometido em tempo real.
  - Quitação de faturas com débito bancário atômico (`INVOICE_PAYMENT`).
- **Sprint 4 - Planejamento (Recorrências, Orçamentos, Metas)**:
  - Motor `RecurringEngine` com projeção preditiva na janela móvel de 60 dias.
  - Orçamentos por categoria com alertas dinâmicos (OK <80%, ALERTA 80-99%, ATINGIDO 100%, EXCEDIDO >100%).
  - Metas financeiras com sugestão matemática de aporte mensal e débitos atômicos em conta.
- **Sprint 5 - Relatórios & Exportação**:
  - DRE Pessoal mensal detalhado com taxa de poupança (`Savings Rate`) e histórico evolutivo dos últimos 6 meses.
  - Exportação de extrato em CSV padrão RFC 4180 com codificação UTF-8 BOM para Excel e proteção contra CSV Injection.
- **Frontend SPA Integrado**:
  - Navegação fluida por abas: Dashboard, Transações, Cartões & Faturas, Orçamentos, Metas, Recorrências, Relatórios.
  - Filtros avançados por texto, tipo, categoria e conta.
  - Modais intuitivos para novos lançamentos, aportes e quitações.

## [0.1.0] - 2026-09-27
### Adicionado
- **Fase 0**: Especificação completa de requisitos, arquitetura modular, modelo de dados e ADRs.
- **Sprint 1 - Fundação**:
  - Setup do monorepo com suporte a CI/CD via GitHub Actions.
  - Servidor Fastify com TypeScript, CORS, Cookie, Rate Limiting e Swagger/OpenAPI.
  - Value Object `Money` com operações exatas em centavos inteiros (proibição de floats).
  - Schema Prisma cobrindo Usuários, Contas, Categorias e Sessões.
  - Módulo de Autenticação completo (Registro, Login com tokens seguros HttpOnly, Logout, Recuperação de senha).
  - Testes unitários do domínio financeiro e testes de integração de API.
  - Frontend SPA com React 19, Vite, Tailwind CSS e Design System base.
