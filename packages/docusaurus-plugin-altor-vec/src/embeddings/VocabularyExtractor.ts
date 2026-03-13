/**
 * Copyright (c) altor-lab
 * SPDX-License-Identifier: MIT
 */

import { Document, Logger } from '../types';

export interface VocabularyStats {
  totalTokens: number;
  uniqueTokens: number;
  vocabularySize: number;
  coveragePercent: number;
}

/**
 * Extracts the most frequent terms from documents to create a vocabulary.
 * This vocabulary will be pre-embedded at build time for lightweight runtime search.
 */
export class VocabularyExtractor {
  constructor(
    private readonly logger: Logger,
    private readonly vocabularySize: number = 2000
  ) {}

  /**
   * Extract top N most frequent terms from documents.
   * Uses TF (term frequency) to identify important terms.
   */
  extract(documents: Document[]): { terms: string[]; stats: VocabularyStats } {
    this.logger.info(`Extracting vocabulary from ${documents.length} documents`);

    // Count term frequencies across all documents
    const termFrequency = new Map<string, number>();
    let totalTokens = 0;

    for (const doc of documents) {
      const tokens = this.tokenize(doc.content);
      totalTokens += tokens.length;

      for (const token of tokens) {
        termFrequency.set(token, (termFrequency.get(token) || 0) + 1);
      }
    }

    // Sort by frequency and take top N
    const sortedTerms = Array.from(termFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.vocabularySize)
      .map(([term]) => term);

    // Calculate coverage statistics
    const vocabularyTokenCount = sortedTerms.reduce(
      (sum, term) => sum + (termFrequency.get(term) || 0),
      0
    );
    const coveragePercent = (vocabularyTokenCount / totalTokens) * 100;

    const stats: VocabularyStats = {
      totalTokens,
      uniqueTokens: termFrequency.size,
      vocabularySize: sortedTerms.length,
      coveragePercent,
    };

    this.logger.info(`Vocabulary extracted: ${stats.vocabularySize} terms covering ${stats.coveragePercent.toFixed(1)}% of content`);

    return { terms: sortedTerms, stats };
  }

  /**
   * Tokenize text into normalized terms.
   * Uses simple word-based tokenization with normalization.
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(token => 
        token.length >= 2 && // Min 2 chars
        token.length <= 20 && // Max 20 chars
        !this.isStopWord(token) // Remove stop words
      );
  }

  /**
   * Check if a token is a common stop word.
   * These are too common to be useful for search.
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
}
