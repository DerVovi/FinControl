import { prisma } from '../../infrastructure/database/prisma.js';
import { PasswordHasher } from '../../infrastructure/security/password.js';
import { TokenService } from '../../infrastructure/security/token.js';
import { AppError, ConflictError } from '../../presentation/errors/app-error.js';

export interface RegisterUserInput {
  fullName: string;
  email: string;
  password: string;
}

export interface AuthOutput {
  user: {
    id: string;
    email: string;
    fullName: string;
    baseCurrency: string;
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

// Categorias padrão recomendadas para inicializar a conta de qualquer usuário
const DEFAULT_SYSTEM_CATEGORIES = [
  // Receitas
  { name: 'Salário', type: 'INCOME', icon: 'briefcase', color: '#10B981' },
  { name: 'Freelance', type: 'INCOME', icon: 'laptop', color: '#3B82F6' },
  { name: 'Investimentos', type: 'INCOME', icon: 'trending-up', color: '#8B5CF6' },
  { name: 'Outras Receitas', type: 'INCOME', icon: 'plus-circle', color: '#6B7280' },
  // Despesas
  { name: 'Alimentação', type: 'EXPENSE', icon: 'utensils', color: '#EF4444' },
  { name: 'Transporte', type: 'EXPENSE', icon: 'car', color: '#F97316' },
  { name: 'Moradia', type: 'EXPENSE', icon: 'home', color: '#F59E0B' },
  { name: 'Saúde', type: 'EXPENSE', icon: 'heart', color: '#EC4899' },
  { name: 'Educação', type: 'EXPENSE', icon: 'book', color: '#6366F1' },
  { name: 'Lazer', type: 'EXPENSE', icon: 'film', color: '#14B8A6' },
  { name: 'Assinaturas', type: 'EXPENSE', icon: 'tv', color: '#8B5CF6' },
  { name: 'Compras', type: 'EXPENSE', icon: 'shopping-bag', color: '#3B82F6' },
  { name: 'Contas Fixas', type: 'EXPENSE', icon: 'file-text', color: '#64748B' },
  { name: 'Impostos', type: 'EXPENSE', icon: 'receipt', color: '#78716C' },
  { name: 'Outras Despesas', type: 'EXPENSE', icon: 'minus-circle', color: '#9CA3AF' }
];

export class RegisterUserUseCase {
  public static async execute(input: RegisterUserInput): Promise<AuthOutput> {
    const emailNormalized = input.email.trim().toLowerCase();

    // 1. Verifica duplicidade de e-mail
    const existing = await prisma.user.findUnique({
      where: { email: emailNormalized }
    });

    if (existing) {
      throw new ConflictError('Já existe um usuário cadastrado com este e-mail');
    }

    // 2. Validação de senha forte
    if (input.password.length < 8) {
      throw new AppError('A senha deve ter no mínimo 8 caracteres');
    }
    const hasUpper = /[A-Z]/.test(input.password);
    const hasLower = /[a-z]/.test(input.password);
    const hasNumber = /[0-9]/.test(input.password);
    if (!hasUpper || !hasLower || !hasNumber) {
      throw new AppError('A senha deve conter letras maiúsculas, minúsculas e números');
    }

    // 3. Hash da senha
    const passwordHash = await PasswordHasher.hash(input.password);

    // 4. Cria usuário e categorias iniciais em transação atômica
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          fullName: input.fullName.trim(),
          email: emailNormalized,
          passwordHash,
          baseCurrency: 'BRL'
        }
      });

      // 1. Seed das categorias padrão para este usuário
      await tx.category.createMany({
        data: DEFAULT_SYSTEM_CATEGORIES.map((cat) => ({
          userId: newUser.id,
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          isSystem: false
        }))
      });

      // 2. Instala a Conta Principal inicial para o usuário já iniciar pronto para uso
      await tx.account.create({
        data: {
          userId: newUser.id,
          name: 'Conta Principal',
          type: 'CHECKING',
          initialBalanceCents: 0n,
          currentBalanceCents: 0n,
          color: '#10B981',
          status: 'ACTIVE'
        }
      });

      return newUser;
    });

    // 5. Emissão de tokens
    const accessToken = TokenService.generateAccessToken({
      sub: user.id,
      email: user.email
    });

    const { token: rawRefreshToken, hash: refreshHash } = TokenService.generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        expiresAt
      }
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        baseCurrency: user.baseCurrency,
        createdAt: user.createdAt
      },
      accessToken,
      refreshToken: rawRefreshToken
    };
  }
}
