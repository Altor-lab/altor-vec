/**
 * Copyright (c) altor-lab
 * SPDX-License-Identifier: MIT
 */

/**
 * Lightweight vocabulary-based embedding lookup for runtime search.
 * Loads pre-embedded vocabulary and generates query embeddings via term averaging.
 */
export class VocabularyLookup {
  private termToEmbedding: Map<string, Float32Array> = new Map();
  private dimensions: number = 0;
  private vocabularySize: number = 0;

  /**
   * Load vocabulary from binary format.
   * Format: [version:u32][dimensions:u32][vocab_size:u32][terms...][embeddings...]
   */
  async loadFromBinary(buffer: ArrayBuffer): Promise<void> {
    const view = new DataView(buffer);
    let offset = 0;

    // Read header
    const version = view.getUint32(offset, true);
    offset += 4;
    
    if (version !== 1) {
      throw new Error(`Unsupported vocabulary version: ${version}`);
    }

    this.dimensions = view.getUint32(offset, true);
    offset += 4;
    this.vocabularySize = view.getUint32(offset, true);
    offset += 4;

    // Read terms
    const terms: string[] = [];
    const decoder = new TextDecoder('utf-8');
    
    for (let i = 0; i < this.vocabularySize; i++) {
      const termLength = view.getUint32(offset, true);
      offset += 4;
      
      const termBytes = new Uint8Array(buffer, offset, termLength);
      const term = decoder.decode(termBytes);
      terms.push(term);
      offset += termLength;
    }

    // Read embeddings
    for (let i = 0; i < this.vocabularySize; i++) {
      const embedding = new Float32Array(this.dimensions);
      
      for (let j = 0; j < this.dimensions; j++) {
        embedding[j] = view.getFloat32(offset, true);
        offset += 4;
      }
      
      this.termToEmbedding.set(terms[i], embedding);
    }

    console.log(`[VocabularyLookup] Loaded ${this.vocabularySize} terms, ${this.dimensions}D embeddings`);
  }

  /**
   * Generate embedding for a query by averaging term embeddings.
   * Unknown terms are skipped (graceful degradation).
   */
  generateEmbedding(query: string): Float32Array {
    const tokens = this.tokenize(query);
    
    if (tokens.length === 0) {
      // Return zero vector for empty query
      return new Float32Array(this.dimensions);
    }

    // Average embeddings of known terms
    const embedding = new Float32Array(this.dimensions);
    let foundTerms = 0;

    for (const token of tokens) {
      const termEmbedding = this.termToEmbedding.get(token);
      if (termEmbedding) {
        for (let i = 0; i < this.dimensions; i++) {
          embedding[i] += termEmbedding[i];
        }
        foundTerms++;
      }
    }

    // Average (or return zero if no terms found)
    if (foundTerms > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        embedding[i] /= foundTerms;
      }
    }

    // Normalize to unit length
    return this.normalize(embedding);
  }

  /**
   * Tokenize query using same logic as vocabulary extraction.
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => 
        token.length >= 2 && 
        token.length <= 20 &&
        !this.isStopWord(token)
      );
  }

  /**
   * Check if token is a stop word.
   */
  private isStopWord(token: string): boolean {
    const stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
      'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
      'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
      'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
      'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
      'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first',
      'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day',
      'most', 'us', 'is', 'was', 'are', 'been', 'has', 'had', 'were', 'said', 'did',
    ]);

    return stopWords.has(token);
  }

  /**
   * Normalize vector to unit length.
   */
  private normalize(vector: Float32Array): Float32Array {
    let magnitude = 0;
    for (let i = 0; i < vector.length; i++) {
      magnitude += vector[i] * vector[i];
    }
    magnitude = Math.sqrt(magnitude);

    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
      }
    }

    return vector;
  }

  /**
   * Get vocabulary statistics.
   */
  getStats() {
    return {
      vocabularySize: this.vocabularySize,
      dimensions: this.dimensions,
      loadedTerms: this.termToEmbedding.size,
    };
  }
}
