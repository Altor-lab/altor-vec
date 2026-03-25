/**
 * Copyright (c) altor-lab
 * SPDX-License-Identifier: MIT
 */

import { PluginOptions, DEFAULT_OPTIONS, ErrorCode } from '../types';
import { PluginError } from './PluginError';

/**
 * Validate and merge user options with defaults.
 */
export function validateAndMergeOptions(
  userOptions: PluginOptions = {}
): Required<PluginOptions> {
  // Merge with defaults
  const options = { ...DEFAULT_OPTIONS, ...userOptions } as any;

  // Validation: embeddingDimensions
  if (options.embeddingDimensions <= 0) {
    throw new PluginError(
      'embeddingDimensions must be positive',
      ErrorCode.INVALID_CONFIG,
      'Set embeddingDimensions to a positive number (e.g., 384 for all-MiniLM-L6-v2)'
    );
  }

  // Validation: hnswM
  if (options.hnswM < 2) {
    throw new PluginError(
      'hnswM must be >= 2',
      ErrorCode.INVALID_CONFIG,
      'Set hnswM to at least 2 (recommended: 16)'
    );
  }

  // Validation: hnswEfConstruction
  if (options.hnswEfConstruction < options.hnswM) {
    throw new PluginError(
      'hnswEfConstruction must be >= hnswM',
      ErrorCode.INVALID_CONFIG,
      `Set hnswEfConstruction to at least ${options.hnswM} (recommended: 200)`
    );
  }

  // Validation: hnswEfSearch
  if (options.hnswEfSearch <= 0) {
    throw new PluginError(
      'hnswEfSearch must be positive',
      ErrorCode.INVALID_CONFIG,
      'Set hnswEfSearch to a positive number (recommended: 50)'
    );
  }

  // Validation: maxResults
  if (options.maxResults <= 0) {
    throw new PluginError(
      'maxResults must be positive',
      ErrorCode.INVALID_CONFIG,
      'Set maxResults to a positive number (e.g., 5)'
    );
  }

  // Validation: debounceMs
  if (options.debounceMs < 0) {
    throw new PluginError(
      'debounceMs must be non-negative',
      ErrorCode.INVALID_CONFIG,
      'Set debounceMs to 0 or higher (recommended: 300)'
    );
  }

  // Validation: maxDocumentLength
  if (options.maxDocumentLength <= 0) {
    throw new PluginError(
      'maxDocumentLength must be positive',
      ErrorCode.INVALID_CONFIG,
      'Set maxDocumentLength to a positive number (e.g., 5000)'
    );
  }

  // Validation: buildConcurrency
  if (options.buildConcurrency <= 0) {
    throw new PluginError(
      'buildConcurrency must be positive',
      ErrorCode.INVALID_CONFIG,
      'Set buildConcurrency to a positive number (e.g., 4)'
    );
  }

  // Validation: OpenAI provider requires API key
  if (options.embeddingProvider === 'openai') {
    if (!options.apiKey && !options.apiKeyEnvVar) {
      throw new PluginError(
        'OpenAI provider requires apiKey or apiKeyEnvVar',
        ErrorCode.MISSING_API_KEY,
        'Set apiKey or apiKeyEnvVar (e.g., "OPENAI_API_KEY") in plugin options'
      );
    }

    // Resolve API key from environment if specified
    if (options.apiKeyEnvVar && !options.apiKey) {
      options.apiKey = process.env[options.apiKeyEnvVar];
      if (!options.apiKey) {
        throw new PluginError(
          `Environment variable ${options.apiKeyEnvVar} is not set`,
          ErrorCode.MISSING_API_KEY,
          `Set the ${options.apiKeyEnvVar} environment variable`
        );
      }
    }
  }

  // Validation: includePatterns
  if (!options.includePatterns || options.includePatterns.length === 0) {
    throw new PluginError(
      'includePatterns must not be empty',
      ErrorCode.INVALID_CONFIG,
      'Set includePatterns to an array of glob patterns (e.g., ["docs/**/*.md"])'
    );
  }

  // Validation: i18n strings
  if (options.i18n) {
    const requiredKeys = [
      'searchPlaceholder',
      'noResults',
      'loading',
      'error',
      'searchResults',
      'poweredBy',
    ];
    for (const key of requiredKeys) {
      if (!options.i18n[key as keyof typeof options.i18n]) {
        throw new PluginError(
          `i18n.${key} is required`,
          ErrorCode.INVALID_CONFIG,
          `Provide a value for i18n.${key}`
        );
      }
    }
  }

  return options as Required<PluginOptions>;
}

/**
 * Sanitize configuration for logging (remove sensitive data).
 */
export function sanitizeConfig(options: PluginOptions): Record<string, any> {
  const sanitized = { ...options };

  // Remove sensitive fields
  if (sanitized.apiKey) {
    sanitized.apiKey = '***REDACTED***';
  }

  // Remove custom providers (can't be serialized)
  delete sanitized.customEmbeddingProvider;
  delete sanitized.customContentExtractor;
  delete sanitized.logger;

  return sanitized;
}
