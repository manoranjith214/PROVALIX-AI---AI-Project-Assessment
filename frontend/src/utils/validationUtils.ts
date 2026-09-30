/**
 * Strict, robust validation utilities for academic project information on the frontend.
 * Rejects empty strings, whitespace-only values, repeated-character garbage,
 * obvious gibberish (e.g. "xxm,m,,", "aaa", "aaaaaaa", "test", "hello"), and placeholder-only text.
 */

export const KNOWN_PLACEHOLDERS = new Set([
  'test',
  'testing',
  'demo',
  'sample',
  'asdf',
  'qwerty',
  'placeholder',
  'none',
  'n/a',
  'na',
  'null',
  'undefined',
  'untitled',
  'project description',
  'description here',
  'title here',
  'problem here',
  'solution here',
  'todo',
  'temp',
  'lorem ipsum',
  'lorem ipsum dolor sit amet',
  'xxm,m,,',
  'xxm',
  'xxx',
  'aaa',
  'aaaaaaa',
  'abc',
  'xyz',
  'hello',
  'hello world',
  'hi',
  'hey',
  'foo',
  'bar',
  'baz',
  'project',
  'my project',
  'new project',
  'first project',
  'test project',
  'demo project',
  'sample project',
  'student',
  'student name',
  'developer',
  'only my name',
  'name',
  'my name',
  'blank',
  'nothing',
  'user',
  'admin',
  'github',
  'repo',
  'stuff',
  'thing',
  'things',
]);

export interface TextValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Checks if text contains common placeholder phrases or known meaningless dummy values
 */
export function containsPlaceholderText(text: string): boolean {
  if (!text) return true;
  const lower = text.trim().toLowerCase();
  if (KNOWN_PLACEHOLDERS.has(lower)) return true;

  // Check if every individual word in the input is a known placeholder
  const words = lower.split(/[\s,._\-+]+/).filter(Boolean);
  if (words.length > 0 && words.every(w => KNOWN_PLACEHOLDERS.has(w))) {
    return true;
  }

  return false;
}

/**
 * Checks for repeated characters, repetitive sequences (e.g. "aaaaa", "abababab", "xmxmxm"),
 * or symbol/punctuation spam (e.g. ",,,,,", ".....", "xxm,m,,")
 */
export function containsCharacterSpam(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();

  // 1. Triple or more of the same character in a row (e.g. "aaa", "xxxx", "....", ",,,")
  if (/(.)\1{2,}/.test(trimmed)) {
    return true;
  }

  // 2. 2-character repetitive pattern 3+ times (e.g. "ababab", "xmxmxm", "oxoxox")
  if (/(..)\1{2,}/i.test(trimmed)) {
    return true;
  }

  // 3. 3-character repetitive pattern 2+ times (e.g. "abcabcabc")
  if (/(...)\1{2,}/i.test(trimmed)) {
    return true;
  }

  // 4. Excessive punctuation or symbols spam: 3 or more symbols in a row
  if (/[,.!?;:_=+\-~`@#$%^&*()]{3,}/.test(trimmed)) {
    return true;
  }

  // 5. Symbol to character ratio: symbols should not exceed 35% of non-whitespace characters
  const nonWhitespaceCount = trimmed.replace(/\s+/g, '').length;
  const alphaChars = trimmed.replace(/[^a-zA-Z]/g, '');
  if (nonWhitespaceCount > 3 && (alphaChars.length / nonWhitespaceCount) < 0.45) {
    return true;
  }

  return false;
}

/**
 * Checks if the string contains a sufficient number of distinct alphanumeric characters
 */
export function hasSufficientUniqueCharacters(text: string, minUnique: number): boolean {
  if (!text) return false;
  const alphaNumChars = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  const uniqueChars = new Set(alphaNumChars);
  return uniqueChars.size >= minUnique;
}

/**
 * Checks if the text has a sufficient count of meaningful words (2+ letters)
 * and ensures they are not all duplicate words.
 */
export function hasSufficientWordCount(text: string, minWords: number): boolean {
  if (!text) return false;
  const words = text.trim().split(/\s+/).filter(w => /[a-zA-Z]{2,}/.test(w));
  if (words.length < minWords) return false;

  // Check unique words (prevent "hello hello hello hello hello")
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const minUniqueWords = Math.min(minWords, Math.max(2, Math.ceil(minWords * 0.5)));
  return uniqueWords.size >= minUniqueWords;
}

/**
 * Validates meaningful academic project text.
 */
export function isMeaningfulText(
  value: unknown,
  minLength: number,
  fieldName: string,
  maxLength: number = 5000
): TextValidationResult {
  if (typeof value !== 'string') {
    return {
      isValid: false,
      error: `Please provide a meaningful ${fieldName.toLowerCase()} of at least ${minLength} characters.`,
    };
  }

  const trimmed = value.trim();

  // 1. Empty or whitespace-only
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: `${fieldName} cannot be empty.`,
    };
  }

  // 2. Minimum length
  if (trimmed.length < minLength) {
    return {
      isValid: false,
      error: `Please provide a meaningful ${fieldName.toLowerCase()} of at least ${minLength} characters.`,
    };
  }

  // 3. Maximum length
  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} exceeds maximum length of ${maxLength} characters.`,
    };
  }

  // 4. Placeholder check
  if (containsPlaceholderText(trimmed)) {
    return {
      isValid: false,
      error: `Please provide actual project information for ${fieldName.toLowerCase()}, not placeholder text.`,
    };
  }

  // 5. Repetitive characters / gibberish spam check
  if (containsCharacterSpam(trimmed)) {
    return {
      isValid: false,
      error: `Please provide a meaningful ${fieldName.toLowerCase()} without repetitive characters or random punctuation.`,
    };
  }

  // 6. Distinct character diversity check
  const requiredUnique = minLength >= 30 ? 8 : Math.max(3, Math.min(6, Math.floor(minLength * 0.6)));
  if (!hasSufficientUniqueCharacters(trimmed, requiredUnique)) {
    return {
      isValid: false,
      error: `Please provide a meaningful, descriptive ${fieldName.toLowerCase()}.`,
    };
  }

  // 7. Word structure and count check
  const requiredWords = minLength >= 30 ? 4 : 1;
  if (!hasSufficientWordCount(trimmed, requiredWords)) {
    return {
      isValid: false,
      error: minLength >= 30
        ? `Please provide a detailed ${fieldName.toLowerCase()} with descriptive sentences.`
        : `Please provide a valid ${fieldName.toLowerCase()} with real words.`,
    };
  }

  return { isValid: true };
}

/**
 * Backward-compatible alias for isMeaningfulText
 */
export const validateMeaningfulText = isMeaningfulText;

/**
 * Validates a GitHub repository URL format
 */
export function isValidGitHubUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < 15) return false;
  return /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/i.test(trimmed);
}
