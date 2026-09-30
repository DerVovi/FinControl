import { prisma } from '../../infrastructure/database/prisma.js';
import { AppError } from '../../presentation/errors/app-error.js';

export interface CreateCategoryInput {
  userId: string;
  name: string;
  type: string;
  icon?: string;
  color?: string;
}

export class CreateCategoryUseCase {
  public static async execute(input: CreateCategoryInput) {
    if (!['INCOME', 'EXPENSE'].includes(input.type)) {
      throw new AppError('Tipo de categoria inválido. Deve ser INCOME ou EXPENSE');
    }

    const category = await prisma.category.create({
      data: {
        userId: input.userId,
        name: input.name.trim(),
        type: input.type,
        icon: input.icon || 'tag',
        color: input.color || '#3B82F6',
        isSystem: false
      }
    });

    return category;
  }
}
