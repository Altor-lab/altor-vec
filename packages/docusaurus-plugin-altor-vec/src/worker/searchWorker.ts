/**
 * Copyright (c) altor-lab
 * SPDX-License-Identifier: MIT
 */

import type { DocumentMetadata } from '../indexer/IndexBuilder';
import { VocabularyLookup } from './VocabularyLookup';

let engine: any = null;
let metadata: DocumentMetadata[] = [];
let vocabularyLookup: VocabularyLookup | null = null;

interface WorkerConfig {
  indexPath: string;
  embeddingModel: string;
  embeddingDimensions: number;
}

interface WorkerMessage {
  type: 'init' | 'search';
  config?: WorkerConfig;
  query?: string;
  topK?: number;
}

let config: WorkerConfig;

async function initialize(workerConfig: WorkerConfig) {
  config = workerConfig;

  try {
    // 1. Initialize WASM
    const { default: init, WasmSearchEngine } = await import('altor-vec');
    await init();

    // 2. Fetch index (using configured path)
    const indexUrl = `/${config.indexPath}/index.bin`;
    const indexResponse = await fetch(indexUrl);

    if (!indexResponse.ok) {
      throw new Error(`Failed to load index from ${indexUrl}: ${indexResponse.status}`);
    }

    // Validate content type and size
    const contentType = indexResponse.headers.get('content-type');
    if (contentType && !contentType.includes('application/octet-stream') && !contentType.includes('binary')) {
      // Allow any binary-like content type, but warn if unexpected
      console.warn(`Unexpected content-type for index: ${contentType}`);
    }

    const contentLength = indexResponse.headers.get('content-length');
    const maxIndexSize = 100 * 1024 * 1024; // 100MB max
    if (contentLength && parseInt(contentLength) > maxIndexSize) {
      throw new Error(`Index too large: ${contentLength} bytes (max ${maxIndexSize})`);
    }

    const indexBytes = new Uint8Array(await indexResponse.arrayBuffer());
    
    // Additional size check after download
    if (indexBytes.length > maxIndexSize) {
      throw new Error(`Index too large: ${indexBytes.length} bytes (max ${maxIndexSize})`);
    }

    engine = new WasmSearchEngine(indexBytes);

    // 3. Fetch metadata
    const metadataUrl = `/${config.indexPath}/metadata.json`;
    const metadataResponse = await fetch(metadataUrl);

    if (!metadataResponse.ok) {
      throw new Error(`Failed to load metadata from ${metadataUrl}: ${metadataResponse.status}`);
    }

    // Validate JSON content type
    const metadataContentType = metadataResponse.headers.get('content-type');
    if (metadataContentType && !metadataContentType.includes('application/json')) {
      console.warn(`Unexpected content-type for metadata: ${metadataContentType}`);
    }

    metadata = await metadataResponse.json();

    // 4. Load vocabulary for lightweight embedding
    const vocabUrl = `/${config.indexPath}/vocabulary.bin`;
    const vocabResponse = await fetch(vocabUrl);

    if (!vocabResponse.ok) {
      throw new Error(`Failed to load vocabulary from ${vocabUrl}: ${vocabResponse.status}`);
    }

    const vocabBuffer = await vocabResponse.arrayBuffer();
    vocabularyLookup = new VocabularyLookup();
    await vocabularyLookup.loadFromBinary(vocabBuffer);

    const vocabStats = vocabularyLookup.getStats();
    console.log(`[SearchWorker] Vocabulary loaded: ${vocabStats.vocabularySize} terms, ${vocabStats.dimensions}D`);

    self.postMessage({ type: 'ready' });
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Initialization failed',
    });
  }
}

async function search(query: string, topK: number) {
  if (!engine || !vocabularyLookup) {
    throw new Error('Search engine not initialized');
  }

  const startTime = performance.now();

  // 1. Generate query embedding using vocabulary lookup
  const embedStart = performance.now();
  const queryEmbedding = vocabularyLookup.generateEmbedding(query);
  const embedTime = performance.now() - embedStart;

  // 2. Search index
  const searchStart = performance.now();
  const rawResults = JSON.parse(engine.search(queryEmbedding, topK));
  const searchTime = performance.now() - searchStart;

  // 3. Hydrate results with metadata
  const results = rawResults.map(([nodeId, distance]: [number, number]) => ({
    ...metadata[nodeId],
    score: 1 - distance, // Convert distance to similarity score
  }));

  const totalTime = performance.now() - startTime;

  self.postMessage({
    type: 'results',
    results,
    timing: {
      embedMs: embedTime.toFixed(1),
      searchMs: searchTime.toFixed(1),
      totalMs: totalTime.toFixed(1),
    },
  });
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, query, topK, config: workerConfig } = e.data;

  try {
    if (type === 'init' && workerConfig) {
      await initialize(workerConfig);
    } else if (type === 'search' && query) {
      await search(query, topK || 5);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
