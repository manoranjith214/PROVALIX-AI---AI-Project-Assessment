export class CodeNormalizer {
  /**
   * Normalizes code for structural similarity comparison:
   * 1. Strips single-line comments (// and #)
   * 2. Strips multi-line comments (/* ... *\/)
   * 3. Normalizes whitespace and removes blank lines
   */
  normalize(code: string): string {
    if (!code || typeof code !== 'string') return '';

    return code
      // Remove multi-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Remove single-line JS/TS/C-style comments
      .replace(/\/\/.*$/gm, '')
      // Remove single-line Python/Shell comments
      .replace(/#.*$/gm, '')
      // Normalize whitespace
      .replace(/[ \t]+/g, ' ')
      // Remove empty lines
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  /**
   * Generates n-gram shingles for similarity comparison
   */
  generateShingles(text: string, n = 5): Set<string> {
    const tokens = text.split(/\s+/).filter(Boolean);
    const shingles = new Set<string>();
    for (let i = 0; i <= tokens.length - n; i++) {
      shingles.add(tokens.slice(i, i + n).join(' '));
    }
    return shingles;
  }

  /**
   * Calculates Jaccard similarity coefficient between two sets of shingles
   */
  calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union > 0 ? (intersection / union) * 100 : 0;
  }
}

export const codeNormalizer = new CodeNormalizer();
