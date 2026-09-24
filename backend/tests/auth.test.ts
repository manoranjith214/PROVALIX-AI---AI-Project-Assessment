import { generateUserId } from '../src/utils/idGenerator';
import { validatePasswordStrength, hashPassword, comparePassword } from '../src/utils/password';
import { signAccessToken, verifyAccessToken } from '../src/utils/token';

describe('Authentication & Identity Unit Tests', () => {
  test('generateUserId generates valid PRV-XXXXX format', () => {
    const id = generateUserId();
    expect(id).toMatch(/^PRV-\d{5}$/);
  });

  test('validatePasswordStrength enforces security rules', () => {
    // Too short
    expect(validatePasswordStrength('Short1!').valid).toBe(false);
    // Missing uppercase
    expect(validatePasswordStrength('lowercase1!').valid).toBe(false);
    // Missing lowercase
    expect(validatePasswordStrength('UPPERCASE1!').valid).toBe(false);
    // Missing number
    expect(validatePasswordStrength('NoNumbers!').valid).toBe(false);
    // Missing special character
    expect(validatePasswordStrength('NoSpecial123').valid).toBe(false);
    // Valid password
    expect(validatePasswordStrength('ValidSecurePassword123!').valid).toBe(true);
  });

  test('hashPassword and comparePassword work securely with bcrypt', async () => {
    const raw = 'SecretPassword987!';
    const hash = await hashPassword(raw);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(raw);

    const isMatch = await comparePassword(raw, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await comparePassword('WrongPassword123!', hash);
    expect(isWrongMatch).toBe(false);
  });

  test('signAccessToken and verifyAccessToken work correctly', () => {
    const userPayload = {
      id: 'uuid-1234-5678',
      permanentId: 'PRV-10482',
      email: 'student@apex.edu',
      name: 'Alex Morgan',
    };

    const token = signAccessToken(userPayload);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.id).toBe(userPayload.id);
    expect(decoded.permanentId).toBe(userPayload.permanentId);
    expect(decoded.email).toBe(userPayload.email);
  });
});
