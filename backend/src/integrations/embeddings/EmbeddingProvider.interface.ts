export interface EmbeddingProvider {
  /**
   * Generates vector embedding for a single text input
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Generates vector embeddings for multiple text inputs
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}
