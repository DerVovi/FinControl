import crypto from 'node:crypto';
import { prisma } from '../../infrastructure/database/prisma.js';

export class ManageWebhookKeyUseCase {
  private static hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  public static async getConfig(userId: string) {
    const record = await prisma.webhookApiKey.findUnique({
      where: { userId }
    });

    if (!record) {
      return {
        configured: false
      };
    }

    return {
      configured: true,
      maskedKey: record.maskedKey,
      createdAt: record.createdAt,
      lastUsedAt: record.lastUsedAt
    };
  }

  public static async generateOrRegenerateKey(userId: string) {
    const rawSecret = crypto.randomBytes(32).toString('hex');
    const apiKey = `fc_whk_${rawSecret}`;
    const keyHash = this.hashKey(apiKey);
    const maskedKey = `fc_whk_••••••••${apiKey.slice(-4)}`;

    await prisma.webhookApiKey.upsert({
      where: { userId },
      update: {
        keyHash,
        maskedKey,
        createdAt: new Date(),
        lastUsedAt: null
      },
      create: {
        userId,
        keyHash,
        maskedKey
      }
    });

    return {
      apiKey,
      maskedKey
    };
  }

  public static async validateKey(rawKey: string): Promise<{ userId: string } | null> {
    if (!rawKey || !rawKey.startsWith('fc_whk_')) {
      return null;
    }

    const keyHash = this.hashKey(rawKey);
    const record = await prisma.webhookApiKey.findUnique({
      where: { keyHash }
    });

    if (!record) {
      return null;
    }

    // Atualiza lastUsedAt de forma assíncrona sem bloquear a requisição
    prisma.webhookApiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() }
    }).catch(() => {});

    return {
      userId: record.userId
    };
  }
}
