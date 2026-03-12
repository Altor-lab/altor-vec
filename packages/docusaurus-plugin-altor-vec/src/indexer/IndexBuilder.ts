/**
 * Copyright (c) altor-lab
 * SPDX-License-Identifier: MIT
 */

import * as fs from 'fs';
import * as path from 'path';
import { Document, Logger } from '../types';
import { PluginError } from '../utils/PluginError';
import { ErrorCode } from '../types';

export interface DocumentMetadata {
  id: string;
  title: string;
  url: string;
  preview: string;
}

export interface IndexStats {
  documentCount: number;
  vectorDimensions: number;
  indexSizeBytes: number;
  buildTimeMs: number;
}

export interface IndexArtifacts {
  indexBytes: Uint8Array;
  metadata: DocumentMetadata[];
  stats: IndexStats;
}

export interface IIndexBuilder {
  build(documents: Document[], embeddings: Float32Array[]): Promise<IndexArtifacts>;
}

export class HnswIndexBuilder implements IIndexBuilder {
  constructor(
    private readonly m: number,
    private readonly efConstruction: number,
    private readonly efSearch: number,
    private readonly logger: Logger
  ) {}

  async build(
    documents: Document[],
    embeddings: Float32Array[]
  ): Promise<IndexArtifacts> {
    const startTime = Date.now();

    try {
      this.logger.info(`Building HNSW index for ${documents.length} documents`);

      // Validate inputs
      if (documents.length !== embeddings.length) {
        throw new PluginError(
          'Document and embedding counts do not match',
          ErrorCode.INVALID_INPUT,
          'Ensure all documents have corresponding embeddings'
        );
      }

      if (embeddings.length === 0) {
        throw new PluginError(
          'No documents to index',
          ErrorCode.EMPTY_INDEX,
          'Add some markdown files to your docs directory'
        );
      }

      // 1. Import and initialize altor-vec WASM
      const altorVec = await import('altor-vec');
      
      // In Node.js, we need to load the WASM file directly instead of using fetch
      const wasmPath = path.join(
        path.dirname(require.resolve('altor-vec')),
        'altor_vec_wasm_bg.wasm'
      );
      const wasmBuffer = fs.readFileSync(wasmPath);
      await altorVec.default(wasmBuffer); // Initialize WASM with buffer
      
      const { WasmSearchEngine } = altorVec;

      // 2. Flatten embeddings array
      this.logger.debug('Flattening embeddings');
      const flatEmbeddings = this.flattenEmbeddings(embeddings);

      // 3. Build index
      this.logger.info('Building HNSW graph...');
      const engine = WasmSearchEngine.from_vectors(
        flatEmbeddings,
        embeddings[0].length,
        this.m,
        this.efConstruction,
        this.efSearch
      );

      // 4. Serialize index
      this.logger.debug('Serializing index');
      const indexBytes = engine.to_bytes();

      // 5. Generate metadata
      const metadata = documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        url: doc.url,
        preview: doc.content.substring(0, 200).trim() + '...',
      }));

      // 6. Compute stats
      const stats: IndexStats = {
        documentCount: documents.length,
        vectorDimensions: embeddings[0].length,
        indexSizeBytes: indexBytes.length,
        buildTimeMs: Date.now() - startTime,
      };

      this.logger.info('Index built successfully', {
        documents: stats.documentCount,
        sizeKB: (stats.indexSizeBytes / 1024).toFixed(2),
        timeMs: stats.buildTimeMs,
      });

      return { indexBytes, metadata, stats };
    } catch (error) {
      this.logger.error('Failed to build index', error as Error);
      throw error instanceof PluginError
        ? error
        : new PluginError(
            'Index building failed',
            ErrorCode.BUILD_FAILED,
            'Check logs for details'
          );
    }
  }

  private flattenEmbeddings(embeddings: Float32Array[]): Float32Array {
    const totalLength = embeddings.reduce((sum, e) => sum + e.length, 0);
    const flat = new Float32Array(totalLength);
    let offset = 0;
    for (const embedding of embeddings) {
      flat.set(embedding, offset);
      offset += embedding.length;
    }
    return flat;
  }
}
