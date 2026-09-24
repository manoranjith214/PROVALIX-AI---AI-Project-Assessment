import { prisma } from '../config/prisma';

export const safeUserSelect = {
  id: true,
  permanentId: true,
  name: true,
  email: true,
  department: true,
  year: true,
  college: true,
  profileImage: true,
  createdAt: true,
  updatedAt: true,
};

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findByPermanentId(permanentId: string) {
    return prisma.user.findUnique({
      where: { permanentId },
      select: safeUserSelect,
    });
  }

  async findByIdOrPermanentId(identifier: string) {
    return prisma.user.findFirst({
      where: {
        OR: [{ id: identifier }, { permanentId: identifier }, { email: identifier.toLowerCase() }],
      },
      select: safeUserSelect,
    });
  }

  async findByEmailOrPermanentId(identifier: string) {
    const trimmed = identifier.trim();
    return prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmed.toLowerCase() },
          { permanentId: trimmed },
        ],
      },
    });
  }

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    permanentId: string;
    department?: string;
    year?: string;
    college?: string;
    profileImage?: string;
  }) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        permanentId: data.permanentId,
        department: data.department,
        year: data.year,
        college: data.college,
        profileImage: data.profileImage,
      },
      select: safeUserSelect,
    });
  }

  async update(id: string, data: { name?: string; department?: string; year?: string; college?: string; profileImage?: string }) {
    return prisma.user.update({
      where: { id },
      data,
      select: safeUserSelect,
    });
  }

  async updatePassword(id: string, passwordHash: string) {
    return prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  async createRefreshToken(userId: string, token: string, expiresAt: Date) {
    return this.upsertRefreshToken(userId, token, expiresAt);
  }

  async upsertRefreshToken(userId: string, token: string, expiresAt: Date) {
    try {
      return await prisma.refreshToken.upsert({
        where: { token },
        update: {
          userId,
          expiresAt,
          revoked: false,
        },
        create: {
          userId,
          token,
          expiresAt,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        const existing = await prisma.refreshToken.findUnique({
          where: { token },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  async findActiveRefreshTokenByUserId(userId: string) {
    return prisma.refreshToken.findFirst({
      where: {
        userId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { select: safeUserSelect } },
    });
  }

  async revokeRefreshToken(token: string) {
    return prisma.refreshToken.update({
      where: { token },
      data: { revoked: true },
    });
  }

  async revokeAllUserRefreshTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date) {
    return prisma.passwordResetToken.create({
      data: { userId, token, expiresAt },
    });
  }

  async findPasswordResetToken(token: string) {
    return prisma.passwordResetToken.findUnique({
      where: { token },
    });
  }

  async markPasswordResetTokenUsed(id: string) {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { used: true },
    });
  }
}

export const userRepository = new UserRepository();
