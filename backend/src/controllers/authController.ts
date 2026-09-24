import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import {
  registerSchema,
  loginSchema,
  supabaseAuthSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from '../validators/authValidator';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await authService.register(validated);
      return sendSuccess(res, result, 'User registered successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const result = await authService.login(email, password);
      return sendSuccess(res, result, 'Logged in successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  async supabaseLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { accessToken } = supabaseAuthSchema.parse(req.body);
      const result = await authService.supabaseLogin(accessToken);
      return sendSuccess(res, result, 'Supabase authentication successful', 200);
    } catch (err) {
      next(err);
    }
  }

  async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = googleAuthSchema.parse(req.body);
      const result = await authService.googleLogin(validated);
      return sendSuccess(res, result, 'Google login processed successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      const result = await authService.forgotPassword(email);
      return sendSuccess(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = resetPasswordSchema.parse(req.body);
      const result = await authService.resetPassword(token, newPassword);
      return sendSuccess(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);
      const result = await authService.refreshTokens(refreshToken);
      return sendSuccess(res, result, 'Token refreshed successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body.refreshToken;
      const result = await authService.logout(refreshToken);
      return sendSuccess(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await authService.getCurrentUser(req.user!.id);
      return sendSuccess(res, result, 'User profile retrieved', 200);
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
