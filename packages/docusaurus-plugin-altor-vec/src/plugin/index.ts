/**
 * Copyright (c) altor-lab
 * SPDX-License-Identifier: MIT
 */

import type { LoadContext, Plugin } from '@docusaurus/types';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PluginOptions } from '../types';
import { validateAndMergeOptions, sanitizeConfig } from '../utils/config';
import { createDefaultLogger } from '../utils/Logger';
import { checkCompatibility } from '../utils/compatibility';
import { MarkdownContentExtractor } from '../indexer/ContentExtractor';
import { TransformersEmbeddingProvider, OpenAIEmbeddingProvider } from '../embeddings/EmbeddingProvider';
import { HnswIndexBuilder } from '../indexer/IndexBuilder';
import type { Document } from '../types';

/**
 * Docusaurus plugin for altor-vec semantic search.
 */
export default function pluginAltorVec(
  context: LoadContext,
  userOptions: PluginOptions = {}
): Plugin {
  // Check compatibility with Docusaurus and Node.js
  checkCompatibility();

  // Validate and merge options with defaults
  const options = validateAndMergeOptions(userOptions);

  // Create logger
  const logger = options.logger || createDefaultLogger(options.logLevel);

  // Log initialization
  logger.info('Initializing altor-vec plugin', {
    embeddingProvider: options.embeddingProvider,
    embeddingModel: options.embeddingModel,
    dimensions: options.embeddingDimensions,
  });

  logger.debug('Plugin configuration:', sanitizeConfig(options));

  return {
    name: 'docusaurus-plugin-altor-vec',

    async loadContent() {
      try {
        logger.info('Loading content for indexing');
        
        // Create content extractor
        const extractor = new MarkdownContentExtractor(
          context.siteDir,
          context.baseUrl,
          {
            maxDocumentLength: options.maxDocumentLength,
            chunkSize: options.chunkSize,
            chunkOverlap: options.chunkOverlap,
            includePatterns: options.includePatterns,
            excludePatterns: options.excludePatterns,
          },
          logger
        );
        
        // Find and extract documents
        const filePaths = await extractor.findFiles();
        logger.info(`Found ${filePaths.length} files to index`);
        
        const documents = await extractor.extractBatch(filePaths);
        logger.info(`Extracted ${documents.length} documents`);
        
        return { documents };
      } catch (error) {
        logger.error('Failed to load content', error as Error);
        if (!options.skipBuildOnError) {
          throw error;
        }
        return null;
      }
    },

    async contentLoaded({ content, actions }: any) {
      try {
        if (!content || !content.documents || content.documents.length === 0) {
          logger.warn('No documents to index');
          return;
        }
        
        logger.info('Building search index');
        const documents = content.documents as Document[];
        
        // Create embedding provider
        let embeddingProvider;
        if (options.embeddingProvider === 'openai') {
          embeddingProvider = new OpenAIEmbeddingProvider(
            options.apiKey!,
            options.embeddingModel,
            options.embeddingDimensions,
            logger
          );
        } else if (options.embeddingProvider === 'transformers') {
          embeddingProvider = new TransformersEmbeddingProvider(
            options.embeddingModel,
            options.embeddingDimensions,
            options.cachePath,
            logger
          );
        } else {
          embeddingProvider = options.customEmbeddingProvider!;
        }
        
        // Initialize provider
        await embeddingProvider.initialize();
        
        // Generate embeddings
        logger.info('Generating embeddings...');
        const texts = documents.map(d => d.content);
        const embeddings = await embeddingProvider.generateBatch(texts);
        
        // Build index
        const indexBuilder = new HnswIndexBuilder(
          options.hnswM,
          options.hnswEfConstruction,
          options.hnswEfSearch,
          logger
        );
        
        const { indexBytes, metadata, stats } = await indexBuilder.build(documents, embeddings);
        
        // Write index and metadata to static directory
        const outputDir = path.join(context.siteDir, options.indexOutputPath);
        await fs.mkdir(outputDir, { recursive: true });
        
        const indexPath = path.join(outputDir, 'index.bin');
        const metadataPath = path.join(outputDir, 'metadata.json');
        
        await fs.writeFile(indexPath, indexBytes);
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
        
        logger.info('Search index built successfully', {
          indexPath,
          metadataPath,
          stats,
        });
        
        // Write config for client
        const configPath = path.join(outputDir, 'config.json');
        await fs.writeFile(configPath, JSON.stringify({
          indexPath: options.indexPath,
          embeddingModel: options.embeddingModel,
          embeddingDimensions: options.embeddingDimensions,
          maxResults: options.maxResults,
          debounceMs: options.debounceMs,
          showTiming: options.showTiming,
          i18n: options.i18n,
        }, null, 2));
        
      } catch (error) {
        logger.error('Failed to build index', error as Error);
        if (!options.skipBuildOnError) {
          throw error;
        }
      }
    },

    // getThemePath() is optional, so we can omit it

    getClientModules() {
      // Client modules for runtime initialization (optional)
      return [];
    },

    configureWebpack() {
      return {
        resolve: {
          alias: {
            '@altor-vec/config': path.join(context.siteDir, options.indexOutputPath, 'config.json'),
          },
        },
      };
    },
  };
}
