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
import { HtmlContentExtractor } from '../indexer/HtmlContentExtractor';
import { TransformersEmbeddingProvider, OpenAIEmbeddingProvider } from '../embeddings/EmbeddingProvider';
import { HnswIndexBuilder } from '../indexer/IndexBuilder';
import { VocabularyExtractor } from '../embeddings/VocabularyExtractor';
import { VocabularyEmbedder } from '../embeddings/VocabularyEmbedder';
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

    async postBuild({ outDir }: any) {
      try {
        logger.info('Building search index from generated HTML');
        
        // Create HTML content extractor
        const extractor = new HtmlContentExtractor(
          {
            maxDocumentLength: options.maxDocumentLength,
            baseUrl: context.baseUrl,
          },
          logger
        );
        
        // Find and extract documents from HTML
        const htmlFiles = await extractor.findFiles(outDir);
        logger.info(`Found ${htmlFiles.length} HTML files to index`);
        
        const documents = await extractor.extractBatch(htmlFiles);
        logger.info(`Extracted ${documents.length} document chunks`);
        
        if (documents.length === 0) {
          logger.warn('No documents to index');
          return;
        }
        
        // Create embedding provider
        let embeddingProvider;
        if (options.embeddingProvider === 'openai') {
          embeddingProvider = new OpenAIEmbeddingProvider(
            options.apiKey!,
            options.embeddingModel,
            options.embeddingDimensions,
            logger,
            options.buildConcurrency
          );
        } else if (options.embeddingProvider === 'transformers') {
          embeddingProvider = new TransformersEmbeddingProvider(
            options.embeddingModel,
            options.embeddingDimensions,
            options.cachePath,
            logger,
            options.buildConcurrency
          );
        } else {
          embeddingProvider = options.customEmbeddingProvider!;
        }
        
        // Initialize provider
        await embeddingProvider.initialize();
        
        // Extract vocabulary from documents
        logger.info('Extracting vocabulary for lightweight runtime search...');
        const vocabularyExtractor = new VocabularyExtractor(logger, 2000);
        const { terms, stats: vocabStats } = vocabularyExtractor.extract(documents);
        
        // Embed vocabulary terms
        logger.info('Embedding vocabulary terms...');
        const vocabularyEmbedder = new VocabularyEmbedder(embeddingProvider, logger);
        const vocabularyEmbeddings = await vocabularyEmbedder.embedVocabulary(terms);
        
        // Generate embeddings for documents
        logger.info('Generating document embeddings...');
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
        
        // Write index and metadata to build output directory
        const outputDir = path.join(outDir, options.indexPath);
        await fs.mkdir(outputDir, { recursive: true });
        
        const indexPath = path.join(outputDir, 'index.bin');
        const metadataPath = path.join(outputDir, 'metadata.json');
        const vocabPath = path.join(outputDir, 'vocabulary.bin');
        const vocabMetaPath = path.join(outputDir, 'vocabulary-meta.json');
        
        await fs.writeFile(indexPath, indexBytes);
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
        
        // Write vocabulary binary and metadata
        await vocabularyEmbedder.serializeToBinary(vocabularyEmbeddings, vocabPath);
        await vocabularyEmbedder.writeMetadata(vocabularyEmbeddings, vocabStats, vocabMetaPath);
        
        logger.info('Search index built successfully', stats);
        logger.info(`Index written to: ${indexPath}`);
        logger.info(`Metadata written to: ${metadataPath}`);
        logger.info('💡 Tip: Altor Cloud builds indexes automatically on every deploy → https://altorlab.dev/cloud');
        
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

    getThemePath() {
      return path.resolve(__dirname, '../theme');
    },

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
