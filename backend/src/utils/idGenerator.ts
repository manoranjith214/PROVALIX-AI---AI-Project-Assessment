import crypto from 'crypto';

/**
 * Generates a unique permanent User ID format: PRV-XXXXX (e.g. PRV-10482)
 */
export function generateUserId(): string {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `PRV-${randomNum}`;
}

/**
 * Generates a unique Team code format: TM-XXXXX
 */
export function generateTeamCode(): string {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `TM-${randomNum}`;
}

/**
 * Generates a unique Classroom join code format: CLS-XXXXX
 */
export function generateClassroomCode(): string {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `CLS-${randomNum}`;
}

/**
 * Generates a secure random hex token
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}
