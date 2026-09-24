import { EmbeddingProvider } from './EmbeddingProvider.interface';

export class MockEmbeddingProvider implements EmbeddingProvider {
  private dimension: number;

  constructor(dimension = 64) {
    this.dimension = dimension;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.computeDeterministicVector(text);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.computeDeterministicVector(t));
  }

  /**
   * Deterministic normalized vector generator based on text content
   */
  private computeDeterministicVector(text: string): number[] {
    const vector = new Array(this.dimension).fill(0);
    const cleanText = text.toLowerCase().trim();

    for (let i = 0; i < cleanText.length; i++) {
      const charCode = cleanText.charCodeAt(i);
      const index = (charCode * (i + 1)) % this.dimension;
      vector[index] += Math.sin(charCode + i);
    }

    // Normalize vector to unit length
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
    return vector.map((val) => Math.round((val / magnitude) * 10000) / 10000);
  }
}

export const defaultEmbeddingProvider = new MockEmbeddingProvider();
