import { config } from '../config/env';
import { userRepository } from '../repositories/userRepository';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { generateUserId, generateSecureToken } from '../utils/idGenerator';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token';
import { AppError } from '../middleware/errorMiddleware';

export class AuthService {
  async register(data: {
    name: string;
    email: string;
    password: string;
    department?: string;
    year?: string;
    college?: string;
  }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError('A user with this email already exists', 409);
    }

    const passwordCheck = validatePasswordStrength(data.password);
    if (!passwordCheck.valid) {
      throw new AppError(passwordCheck.reason || 'Password does not meet requirements', 400);
    }

    // Generate unique PRV-XXXXX permanent ID
    let permanentId = generateUserId();
    let existsWithId = await userRepository.findByPermanentId(permanentId);
    while (existsWithId) {
      permanentId = generateUserId();
      existsWithId = await userRepository.findByPermanentId(permanentId);
    }

    const passwordHash = await hashPassword(data.password);

    const user = await userRepository.create({
      name: data.name,
      email: data.email,
      passwordHash,
      permanentId,
      department: data.department || 'Computer Science & Engineering',
      year: data.year || '1st Year',
      college: data.college || 'Apex Institute of Technology & Research',
    });

    const accessToken = signAccessToken({
      id: user.id,
      permanentId: user.permanentId,
      email: user.email,
      name: user.name,
    });

    const refreshToken = signRefreshToken({ id: user.id });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await userRepository.upsertRefreshToken(user.id, refreshToken, expiresAt);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async login(emailOrPermanentId: string, password: string) {
    const user = await userRepository.findByEmailOrPermanentId(emailOrPermanentId);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const safeUser = {
      id: user.id,
      permanentId: user.permanentId,
      name: user.name,
      email: user.email,
      department: user.department,
      year: user.year,
      college: user.college,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const accessToken = signAccessToken({
      id: user.id,
      permanentId: user.permanentId,
      email: user.email,
      name: user.name,
    });

    // Check if user already has an active, valid refresh token
    const activeRefreshTokenRecord = await userRepository.findActiveRefreshTokenByUserId(user.id);
    let refreshToken: string;

    if (activeRefreshTokenRecord && activeRefreshTokenRecord.expiresAt > new Date(Date.now() + 24 * 60 * 60 * 1000)) {
      refreshToken = activeRefreshTokenRecord.token;
    } else {
      refreshToken = signRefreshToken({ id: user.id });
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await userRepository.upsertRefreshToken(user.id, refreshToken, expiresAt);
    }

    return {
      user: safeUser,
      accessToken,
      refreshToken,
    };
  }

  async supabaseLogin(accessToken: string) {
    if (!accessToken) {
      throw new AppError('Supabase access token is required', 400);
    }

    if (!config.supabase.url || !config.supabase.publishableKey) {
      throw new AppError('Supabase credentials are not configured on the server', 500);
    }

    let sbUser: any = null;
    try {
      const endpoint = `${config.supabase.url.replace(/\/+$/, '')}/auth/v1/user`;
      const verifyRes = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: config.supabase.publishableKey,
        },
      });

      if (!verifyRes.ok) {
        throw new AppError('Invalid or expired Supabase authentication session', 401);
      }

      sbUser = await verifyRes.json();
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError('Invalid or expired Supabase authentication session', 401);
    }

    if (!sbUser || !sbUser.id) {
      throw new AppError('Invalid or expired Supabase authentication session', 401);
    }

    const email = sbUser.email;
    if (!email) {
      throw new AppError('Authenticated Google account did not return a verified email', 400);
    }

    const name =
      (sbUser.user_metadata?.full_name as string) ||
      (sbUser.user_metadata?.name as string) ||
      email.split('@')[0];
    const avatar =
      (sbUser.user_metadata?.avatar_url as string) ||
      (sbUser.user_metadata?.picture as string) ||
      null;

    let user = await userRepository.findByEmail(email);
    if (!user) {
      let permanentId = generateUserId();
      while (await userRepository.findByPermanentId(permanentId)) {
        permanentId = generateUserId();
      }

      const randomPassword = generateSecureToken(16) + 'A1!';
      const passwordHash = await hashPassword(randomPassword);

      try {
        await userRepository.create({
          name,
          email,
          passwordHash,
          permanentId,
          department: 'Information Technology',
          year: '1st Year',
          college: 'Apex Institute of Technology & Research',
          profileImage: avatar || undefined,
        });
      } catch (createErr: any) {
        // Handle concurrent registration race condition gracefully
        if (createErr.code === 'P2002') {
          user = await userRepository.findByEmail(email);
        } else {
          throw createErr;
        }
      }

      user = await userRepository.findByEmail(email);
    } else if (avatar && !user.profileImage) {
      await userRepository.update(user.id, { profileImage: avatar });
      user = await userRepository.findByEmail(email);
    }

    if (!user) {
      throw new AppError('Failed to process user authentication', 500);
    }

    const safeUser = {
      id: user.id,
      permanentId: user.permanentId,
      name: user.name,
      email: user.email,
      department: user.department,
      year: user.year,
      college: user.college,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const provalixAccessToken = signAccessToken({
      id: user.id,
      permanentId: user.permanentId,
      email: user.email,
      name: user.name,
    });

    // Check if user already has an active, valid, unrevoked session refresh token
    const activeRefreshTokenRecord = await userRepository.findActiveRefreshTokenByUserId(user.id);
    let provalixRefreshToken: string;

    if (activeRefreshTokenRecord && activeRefreshTokenRecord.expiresAt > new Date(Date.now() + 24 * 60 * 60 * 1000)) {
      // Reuse existing active session token gracefully without creating duplicate database records
      provalixRefreshToken = activeRefreshTokenRecord.token;
    } else {
      // Generate new cryptographically unique refresh token
      provalixRefreshToken = signRefreshToken({ id: user.id });
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await userRepository.upsertRefreshToken(user.id, provalixRefreshToken, expiresAt);
    }

    return {
      user: safeUser,
      accessToken: provalixAccessToken,
      refreshToken: provalixRefreshToken,
    };
  }

  async googleLogin(data: { accessToken?: string; token?: string }) {
    const token = data.accessToken || data.token;
    if (!token) {
      throw new AppError('OAuth access token is required', 400);
    }
    return this.supabaseLogin(token);
  }

  async forgotPassword(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Do not leak email existence
      return { message: 'If this email exists in our system, a password reset link has been dispatched.' };
    }

    const token = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await userRepository.createPasswordResetToken(user.id, token, expiresAt);

    // In production, dispatch email here. In development, return reset token for testing convenience
    return {
      message: 'Password reset token generated successfully.',
      resetToken: process.env.NODE_ENV !== 'production' ? token : undefined,
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const resetRecord = await userRepository.findPasswordResetToken(token);
    if (!resetRecord || resetRecord.used || resetRecord.expiresAt < new Date()) {
      throw new AppError('Invalid or expired password reset token', 400);
    }

    const passwordCheck = validatePasswordStrength(newPassword);
    if (!passwordCheck.valid) {
      throw new AppError(passwordCheck.reason || 'Password does not meet requirements', 400);
    }

    const passwordHash = await hashPassword(newPassword);
    await userRepository.updatePassword(resetRecord.userId, passwordHash);
    await userRepository.markPasswordResetTokenUsed(resetRecord.id);

    return { message: 'Password has been successfully reset. You may now log in.' };
  }

  async refreshTokens(refreshToken: string) {
    try {
      verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const tokenRecord = await userRepository.findRefreshToken(refreshToken);
    if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
      throw new AppError('Refresh token has been revoked or expired', 401);
    }

    const user = tokenRecord.user;
    const newAccessToken = signAccessToken({
      id: user.id,
      permanentId: user.permanentId,
      email: user.email,
      name: user.name,
    });

    return {
      accessToken: newAccessToken,
      user,
    };
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      try {
        await userRepository.revokeRefreshToken(refreshToken);
      } catch {
        // Ignore if already revoked
      }
    }
    return { message: 'Logged out successfully' };
  }

  async getCurrentUser(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }
}

export const authService = new AuthService();
