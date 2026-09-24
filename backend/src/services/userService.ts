import { userRepository } from '../repositories/userRepository';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { AppError } from '../middleware/errorMiddleware';

export class UserService {
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  async updateProfile(userId: string, data: { name?: string; department?: string; year?: string; college?: string; profileImage?: string }) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    return userRepository.update(userId, data);
  }

  async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await userRepository.findByEmail((await userRepository.findById(userId))?.email || '');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isMatch = await comparePassword(currentPass, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    const check = validatePasswordStrength(newPass);
    if (!check.valid) {
      throw new AppError(check.reason || 'New password does not meet criteria', 400);
    }

    const passwordHash = await hashPassword(newPass);
    await userRepository.updatePassword(userId, passwordHash);

    return { message: 'Password updated successfully' };
  }

  async getPublicProfile(identifier: string) {
    const user = await userRepository.findByIdOrPermanentId(identifier);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }
}

export const userService = new UserService();
