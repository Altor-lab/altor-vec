/**
 * Copyright (c) altor-lab
 * SPDX-License-Identifier: MIT
 */

/**
 * Plugin configuration options.
 * All options are optional and have sensible defaults.
 */
export interface PluginOptions {
  // Embedding configuration
  embeddingProvider?: 'transformers' | 'openai' | 'custom';
  embeddingModel?: string;
  embeddingDimensions?: number;
  
  // API configuration (for OpenAI provider)
  apiKey?: string;
  apiKeyEnvVar?: string;
  
  // Altor Cloud configuration
  altorCloudKey?: string;
  
  // WASM configuration
  wasmPath?: string;
  
  // Index configuration
  indexPath?: string;
  indexOutputPath?: string;
  hnswM?: number;
  hnswEfConstruction?: number;
  hnswEfSearch?: number;
  
  // Content configuration
  includePatterns?: string[];
  excludePatterns?: string[];
  maxDocumentLength?: number;
  chunkSize?: number;
  chunkOverlap?: number;
  
  // UI configuration
  searchBarPosition?: 'navbar' | 'sidebar' | 'custom';
  placeholder?: string;
  maxResults?: number;
  debounceMs?: number;
  showTiming?: boolean;
  
  // Build configuration
  buildConcurrency?: number;
  cachePath?: string;
  skipBuildOnError?: boolean;
  
  // Internationalization
  i18n?: I18nStrings;
  
  // Logging
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  logger?: Logger;
  
  // Advanced
  customEmbeddingProvider?: IEmbeddingProvider;
  customContentExtractor?: IContentExtractor;
}

/**
 * Internationalization strings for UI.
 */
export interface I18nStrings {
  searchPlaceholder: string;
  noResults: string;
  loading: string;
  error: string;
  searchResults: string;
  poweredBy: string;
}

/**
 * Logger interface for structured logging.
 */
export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: Error, meta?: any): void;
}

/**
 * Embedding provider interface.
 */
export interface IEmbeddingProvider {
  initialize(): Promise<void>;
  generateEmbedding(text: string): Promise<Float32Array>;
  generateBatch(texts: string[]): Promise<Float32Array[]>;
  getDimensions(): number;
}

/**
 * Content extractor interface.
 */
export interface IContentExtractor {
  extract(filePath: string): Promise<Document>;
  extractBatch(filePaths: string[]): Promise<Document[]>;
}

/**
 * Document structure.
 */
export interface Document {
  id: string;
  title: string;
  content: string;
  url: string;
  metadata: {
    section?: string;
    tags?: string[];
    lastModified?: Date;
  };
}

/**
 * Default configuration values.
 */
export const DEFAULT_OPTIONS: Required<Omit<PluginOptions, 'apiKey' | 'apiKeyEnvVar' | 'altorCloudKey' | 'wasmPath' | 'customEmbeddingProvider' | 'customContentExtractor' | 'logger'>> = {
  embeddingProvider: 'transformers',
  embeddingModel: 'Xenova/all-MiniLM-L6-v2',
  embeddingDimensions: 384,
  indexPath: '__altor-vec__',
  indexOutputPath: 'static/__altor-vec__',
  hnswM: 16,
  hnswEfConstruction: 200,
  hnswEfSearch: 50,
  includePatterns: ['docs/**/*.md', 'blog/**/*.md'],
  excludePatterns: ['**/node_modules/**', '**/_*.md'],
  maxDocumentLength: 5000,
  chunkSize: 1000,
  chunkOverlap: 200,
  searchBarPosition: 'navbar',
  placeholder: 'Search documentation...',
  maxResults: 5,
  debounceMs: 300,
  showTiming: false,
  buildConcurrency: 4,
  cachePath: '.cache/altor-vec',
  skipBuildOnError: false,
  i18n: {
    searchPlaceholder: 'Search documentation...',
    noResults: 'No results found',
    loading: 'Loading...',
    error: 'Search error',
    searchResults: 'Search results',
    poweredBy: 'Powered by altor-vec',
  },
  logLevel: 'info',
};

/**
 * Error codes for plugin errors.
 */
export enum ErrorCode {
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_API_KEY = 'MISSING_API_KEY',
  INVALID_API_KEY = 'INVALID_API_KEY',
  VERSION_INCOMPATIBLE = 'VERSION_INCOMPATIBLE',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  MODEL_INIT_FAILED = 'MODEL_INIT_FAILED',
  EMBEDDING_FAILED = 'EMBEDDING_FAILED',
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  EMPTY_INDEX = 'EMPTY_INDEX',
  BUILD_FAILED = 'BUILD_FAILED',
}
