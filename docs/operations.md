# Manual de Operações & Manutenção — FinControl

Este documento estabelece os procedimentos operacionais para implantação, rotinas de backup, gerenciamento de banco de dados, monitoramento e solução de problemas do **FinControl** em ambiente de produção.

---

## 1. Topologia de Implantação

O FinControl é distribuído como uma arquitetura desacoplada de microsserviços/contêineres:

```text
       Internet / Navegador do Usuário
                      │
                      ▼ Porta 80 / 443
           ┌──────────────────────┐
           │   Nginx (Frontend)   │
           │  (SPA React 19 +     │
           │   Proxy Reverso)     │
           └──────────┬───────────┘
                      │ /api/
                      ▼ Porta 3333
           ┌──────────────────────┐
           │   Fastify Backend    │
           │   (Node 22 LTS)      │
           └──────────┬───────────┘
                      │
                      ▼
        ┌────────────────────────────┐
        │   SQLite DB (Volume Docker)│
        │  /app/prisma/data/*.db     │
        └────────────────────────────┘
```

---

## 2. Deploy Rápido com Docker Compose

### Pré-requisitos
- **Docker Engine** 24.0+ e **Docker Compose** v2+ instalados.
- Arquivo `.env` configurado na raiz a partir do `.env.example`.

### Passo a Passo

1. **Configurar variáveis de ambiente**:
   ```bash
   cp .env.example .env
   ```
   *Edite o `.env` gerando chaves seguras para `JWT_SECRET` e `JWT_REFRESH_SECRET` (ex: `openssl rand -base64 32`).*

2. **Compilar e iniciar contêineres**:
   ```bash
   docker compose up -d --build
   ```

3. **Verificar status dos serviços**:
   ```bash
   docker compose ps
   ```
   Ambos os contêineres (`fincontrol-backend` e `fincontrol-frontend`) devem reportar status `healthy`.

4. **Acessar a aplicação**:
   - Interface Web: `http://localhost:80`
   - Documentação Interativa da API (Swagger): `http://localhost:3333/docs`
   - Healthcheck: `http://localhost:3333/api/v1/health`

---

## 3. Gestão e Manutenção do Banco de Dados (SQLite)

O banco de dados SQLite é mantido em um volume Docker persistente montado em `/app/prisma/data/fincontrol.db`.

### 3.1 Executar Migrações em Produção
Quando novas tabelas ou índices forem criados:
```bash
docker compose exec backend npx prisma migrate deploy
```

### 3.2 Rotina de Backup a Quente (Hot Backup)
O SQLite suporta cópias atômicas sem travar leituras nem escritas através da API de backup do SQLite:

```bash
# Executa snapshot consistente diretamente do contêiner
docker compose exec backend sqlite3 /app/prisma/data/fincontrol.db ".backup /app/prisma/data/backup-$(date +%Y%m%d_%H%M%S).db"

# Ou copia para a máquina host:
docker cp fincontrol-backend:/app/prisma/data/fincontrol.db ./backups/fincontrol-backup-$(date +%Y%m%d).db
```

### 3.3 Procedimento de Restauração (Disaster Recovery)
Em caso de falha ou corrupção:
1. Parar o serviço de backend:
   ```bash
   docker compose stop backend
   ```
2. Substituir o arquivo corrompido pelo backup íntegro:
   ```bash
   docker cp ./backups/fincontrol-backup-YYYYMMDD.db fincontrol-backend:/app/prisma/data/fincontrol.db
   ```
3. Reiniciar o serviço:
   ```bash
   docker compose start backend
   ```

---

## 4. Monitoramento e Diagnóstico de Saúde

### 4.1 Endpoint de Healthcheck
A API expõe o endpoint `GET /api/v1/health` para verificadores automatizados (ex: Uptime Kuma, AWS ALB, Datadog):

**Resposta de Sucesso (200 OK)**:
```json
{
  "status": "healthy",
  "service": "fincontrol-api",
  "timestamp": "2026-09-28T21:40:00.000Z",
  "uptime": 3600.42
}
```

### 4.2 Inspeção de Logs
```bash
# Logs do Backend em tempo real
docker compose logs -f backend

# Logs do Frontend / Nginx (acessos e erros de proxy)
docker compose logs -f frontend
```

---

## 5. Dicionário de Variáveis de Ambiente

| Variável | Padrão | Obrigatória? | Descrição |
|---|---|---|---|
| `NODE_ENV` | `production` | Sim | Ambiente de execução (`production`, `development`, `test`). |
| `PORT` | `3333` | Sim | Porta HTTP do servidor Fastify. |
| `FRONTEND_PORT` | `80` | Não | Porta externa mapeada pelo Nginx. |
| `DATABASE_URL` | `file:/app/...` | Sim | URI de conexão Prisma SQLite. |
| `JWT_SECRET` | — | Sim (min 32 car.) | Segredo HMAC para assinatura do Access Token. |
| `JWT_REFRESH_SECRET` | — | Sim (min 32 car.) | Segredo criptográfico para geração de Refresh Tokens. |
| `CLIENT_URL` | `http://localhost:80` | Sim | Origem permitida nas políticas de CORS. |

---

## 6. Solução de Problemas Comuns (Troubleshooting)

### Porta 80 ou 3333 já em uso
- Altere `FRONTEND_PORT` ou `PORT` no arquivo `.env` para portas alternativas (ex: `FRONTEND_PORT=8080`, `PORT=3334`).

### Erro de permissão no volume SQLite
- O Dockerfile executa com usuário não-root `fincontrol`. Caso ocorra erro `EACCES: permission denied`, assegure que o diretório persistente no host tenha permissão de escrita para o UID do contêiner.

### Tokens expirados ou falhas de renovação
- Se o usuário reportar desconexão precoce, verifique se a sincronização de relógio (NTP) do servidor está ativa. O access token possui tolerância estrita de 15 minutos, enquanto o refresh token persiste por 7 dias em cookie seguro `HttpOnly`.
