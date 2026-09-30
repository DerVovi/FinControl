import { prisma } from '../../infrastructure/database/prisma.js';

export class ListCategoriesUseCase {
  public static async execute(userId: string, type?: string) {
    const where: any = {
      OR: [{ userId }, { isSystem: true }]
    };

    if (type) {
      where.type = type;
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }]
    });

    return categories;
  }
}
