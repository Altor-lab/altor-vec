/**
 * Copyright (c) altor-lab
 * SPDX-License-Identifier: MIT
 */

import * as fs from 'fs/promises';
import { IEmbeddingProvider, Logger } from '../types';

export interface VocabularyEmbedding {
  term: string;
  embedding: Float32Array;
}

/**
 * Creates pre-embedded vocabulary for lightweight runtime search.
 * Embeds vocabulary terms at build time and serializes to binary format.
 */
export class VocabularyEmbedder {
  constructor(
    private readonly embeddingProvider: IEmbeddingProvider,
    private readonly logger: Logger
  ) {}

  /**
   * Embed all vocabulary terms and return embeddings.
   */
  async embedVocabulary(terms: string[]): Promise<VocabularyEmbedding[]> {
    this.logger.info(`Embedding ${terms.length} vocabulary terms`);

    const embeddings = await this.embeddingProvider.generateBatch(terms);
    
    const vocabularyEmbeddings: VocabularyEmbedding[] = terms.map((term, i) => ({
      term,
      embedding: embeddings[i],
    }));

    this.logger.info(`Vocabulary embeddings generated successfully`);
    return vocabularyEmbeddings;
  }

  /**
   * Serialize vocabulary embeddings to binary format.
   * Format: [version:u32][dimensions:u32][vocab_size:u32][terms...][embeddings...]
   */
  async serializeToBinary(
    vocabularyEmbeddings: VocabularyEmbedding[],
    outputPath: string
  ): Promise<void> {
    if (vocabularyEmbeddings.length === 0) {
      throw new Error('Cannot serialize empty vocabulary');
    }

    const dimensions = vocabularyEmbeddings[0].embedding.length;
    const vocabSize = vocabularyEmbeddings.length;

    // Calculate buffer size
    const headerSize = 12; // version(4) + dimensions(4) + vocab_size(4)
    const termsSize = vocabularyEmbeddings.reduce((sum, ve) => sum + 4 + ve.term.length, 0); // length(4) + chars
    const embeddingsSize = vocabSize * dimensions * 4; // float32
    const totalSize = headerSize + termsSize + embeddingsSize;

    const buffer = Buffer.allocUnsafe(totalSize);
    let offset = 0;

    // Write header
    buffer.writeUInt32LE(1, offset); // version
    offset += 4;
    buffer.writeUInt32LE(dimensions, offset);
    offset += 4;
    buffer.writeUInt32LE(vocabSize, offset);
    offset += 4;

    // Write terms
    for (const ve of vocabularyEmbeddings) {
      const termBuffer = Buffer.from(ve.term, 'utf-8');
      buffer.writeUInt32LE(termBuffer.length, offset);
      offset += 4;
      termBuffer.copy(buffer, offset);
      offset += termBuffer.length;
    }

    // Write embeddings
    for (const ve of vocabularyEmbeddings) {
      for (let i = 0; i < dimensions; i++) {
        buffer.writeFloatLE(ve.embedding[i], offset);
        offset += 4;
      }
    }

    await fs.writeFile(outputPath, buffer);

    const sizeKB = (totalSize / 1024).toFixed(1);
    this.logger.info(`Vocabulary binary written: ${outputPath} (${sizeKB} KB)`);
  }

  /**
   * Create a JSON metadata file for the vocabulary.
   */
  async writeMetadata(
    vocabularyEmbeddings: VocabularyEmbedding[],
    stats: any,
    outputPath: string
  ): Promise<void> {
    const metadata = {
      version: 1,
      vocabularySize: vocabularyEmbeddings.length,
      dimensions: vocabularyEmbeddings[0]?.embedding.length || 0,
      stats,
      createdAt: new Date().toISOString(),
      topTerms: vocabularyEmbeddings.slice(0, 50).map(ve => ve.term),
    };

    await fs.writeFile(outputPath, JSON.stringify(metadata, null, 2));
    this.logger.info(`Vocabulary metadata written: ${outputPath}`);
  }
}
