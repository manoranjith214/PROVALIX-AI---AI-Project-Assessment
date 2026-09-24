import { authService } from '../src/services/authService';
import { userRepository } from '../src/repositories/userRepository';
import { signRefreshToken, verifyRefreshToken } from '../src/utils/token';

describe('Google OAuth & Token Idempotency Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('signRefreshToken produces cryptographically distinct tokens with unique jti across calls', () => {
    const token1 = signRefreshToken({ id: 'user-123' });
    const token2 = signRefreshToken({ id: 'user-123' });

    // Tokens generated in the same execution must not collide
    expect(token1).not.toBe(token2);

    const verified1 = verifyRefreshToken(token1);
    const verified2 = verifyRefreshToken(token2);

    expect(verified1.id).toBe('user-123');
    expect(verified2.id).toBe('user-123');
    expect(verified1.jti).toBeDefined();
    expect(verified2.jti).toBeDefined();
    expect(verified1.jti).not.toBe(verified2.jti);
  });

  test('Repeated Google logins for existing user reuse active session without duplicate insertion', async () => {
    const fakeGoogleUser = {
      id: 'google-sub-456',
      email: 'alex.google@institution.edu',
      user_metadata: {
        full_name: 'Alex Rivera',
        avatar_url: 'https://lh3.googleusercontent.com/a/photo123',
      },
    };

    // Mock fetch for Supabase user verification
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeGoogleUser,
    }) as any;

    const existingUser = {
      id: 'usr-google-999',
      permanentId: 'PRV-88219',
      name: 'Alex Rivera',
      email: 'alex.google@institution.edu',
      passwordHash: 'hashed_pwd',
      department: 'Information Technology',
      year: '1st Year',
      college: 'Apex Institute of Technology & Research',
      profileImage: 'https://lh3.googleusercontent.com/a/photo123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingActiveToken = {
      id: 'tok-rec-1',
      token: 'existing-active-refresh-token-string',
      userId: existingUser.id,
      expiresAt: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000), // 29 days left
      revoked: false,
      createdAt: new Date(),
    };

    const findByEmailSpy = jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(existingUser as any);
    const findActiveTokenSpy = jest.spyOn(userRepository, 'findActiveRefreshTokenByUserId').mockResolvedValue(existingActiveToken as any);
    const upsertTokenSpy = jest.spyOn(userRepository, 'upsertRefreshToken');

    const result = await authService.supabaseLogin('valid-google-supabase-access-token');

    expect(result.user.id).toBe(existingUser.id);
    expect(result.user.email).toBe(existingUser.email);
    expect(result.accessToken).toBeDefined();
    // Must reuse the existing active token
    expect(result.refreshToken).toBe(existingActiveToken.token);
    // Must NOT insert duplicate token
    expect(upsertTokenSpy).not.toHaveBeenCalled();

    findByEmailSpy.mockRestore();
    findActiveTokenSpy.mockRestore();
    upsertTokenSpy.mockRestore();
  });

  test('Concurrent Google logins for new user resolve safely without P2002 duplicate collision', async () => {
    const fakeGoogleUser = {
      id: 'google-sub-789',
      email: 'samantha.google@institution.edu',
      user_metadata: {
        full_name: 'Samantha Rao',
        avatar_url: 'https://lh3.googleusercontent.com/a/photo789',
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeGoogleUser,
    }) as any;

    const createdUser = {
      id: 'usr-google-789',
      permanentId: 'PRV-11223',
      name: 'Samantha Rao',
      email: 'samantha.google@institution.edu',
      passwordHash: 'hashed_pwd',
      department: 'Information Technology',
      year: '1st Year',
      college: 'Apex Institute of Technology & Research',
      profileImage: 'https://lh3.googleusercontent.com/a/photo789',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let userCreated = false;
    const findByEmailSpy = jest.spyOn(userRepository, 'findByEmail').mockImplementation(async () => {
      return userCreated ? (createdUser as any) : null;
    });

    const createSpy = jest.spyOn(userRepository, 'create').mockImplementation(async () => {
      userCreated = true;
      return createdUser as any;
    });

    const findByPermanentIdSpy = jest.spyOn(userRepository, 'findByPermanentId').mockResolvedValue(null);
    const findActiveTokenSpy = jest.spyOn(userRepository, 'findActiveRefreshTokenByUserId').mockResolvedValue(null);
    const upsertTokenSpy = jest.spyOn(userRepository, 'upsertRefreshToken').mockResolvedValue({
      id: 'tok-new',
      token: 'new-token',
      userId: createdUser.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      revoked: false,
      createdAt: new Date(),
    } as any);

    // Run two concurrent requests
    const [res1, res2] = await Promise.all([
      authService.supabaseLogin('valid-google-supabase-access-token-1'),
      authService.supabaseLogin('valid-google-supabase-access-token-2'),
    ]);

    expect(res1.user.email).toBe(fakeGoogleUser.email);
    expect(res2.user.email).toBe(fakeGoogleUser.email);
    expect(res1.accessToken).toBeDefined();
    expect(res2.accessToken).toBeDefined();

    findByEmailSpy.mockRestore();
    createSpy.mockRestore();
    findByPermanentIdSpy.mockRestore();
    findActiveTokenSpy.mockRestore();
    upsertTokenSpy.mockRestore();
  });
});
