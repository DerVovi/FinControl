# Stage 1: Build & Compile TypeScript
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies)
RUN npm ci

# Generate Prisma Client
RUN npm run prisma:generate

# Copy TypeScript config and sources
COPY tsconfig.json ./
COPY src ./src/

# Compile TypeScript to JavaScript in /app/dist
RUN npm run build

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3333

# Create non-root system user and group for security
RUN addgroup -S fincontrol && adduser -S fincontrol -G fincontrol

# Copy package manifests and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy generated Prisma Client and compiled code from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist

# Create database directory for SQLite volume with non-root ownership
RUN mkdir -p /app/prisma/data && chown -R fincontrol:fincontrol /app

USER fincontrol

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3333/api/v1/health || exit 1

CMD ["node", "dist/presentation/server.js"]
