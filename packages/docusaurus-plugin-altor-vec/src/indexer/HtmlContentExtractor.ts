/**
 * Copyright (c) altor-lab
 * SPDX-License-Identifier: MIT
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { load } from 'cheerio';
import { glob } from 'glob';
import { Document, Logger } from '../types';
import { PluginError } from '../utils/PluginError';
import { ErrorCode } from '../types';

export interface HtmlExtractionOptions {
  maxDocumentLength: number;
  baseUrl: string;
}

export interface IContentExtractor {
  extract(filePath: string): Promise<Document[]>;
  extractBatch(filePaths: string[]): Promise<Document[]>;
  findFiles(outDir: string): Promise<string[]>;
}

export class HtmlContentExtractor implements IContentExtractor {
  constructor(
    private readonly options: HtmlExtractionOptions,
    private readonly logger: Logger
  ) {}

  /**
   * Find all HTML files in the build output directory.
   */
  async findFiles(outDir: string): Promise<string[]> {
    const htmlFiles = await glob('**/*.html', {
      cwd: outDir,
      absolute: true,
      ignore: ['**/node_modules/**', '**/_*.html'],
    });

    return htmlFiles;
  }

  /**
   * Extract documents from a single HTML file.
   * Splits content by h2/h3 headings to create multiple chunks per page.
   */
  async extract(filePath: string): Promise<Document[]> {
    try {
      // 1. Check file size
      const fileStats = await fs.stat(filePath);
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      if (fileStats.size > maxFileSize) {
        this.logger.warn(`Skipping large file (${(fileStats.size / 1024 / 1024).toFixed(2)}MB): ${filePath}`);
        return [];
      }

      // 2. Read and parse HTML
      const html = await fs.readFile(filePath, 'utf-8');
      const $ = load(html);

      // 3. Extract main content (look for article, main, or .markdown elements)
      const contentSelectors = ['article', 'main', '.markdown', '[role="main"]'];
      let $content: any = $('article');
      
      if ($content.length === 0) {
        for (const selector of contentSelectors) {
          $content = $(selector);
          if ($content.length > 0) break;
        }
      }

      if ($content.length === 0) {
        this.logger.warn(`No main content found in: ${filePath}`);
        return [];
      }

      // 4. Extract page title
      const pageTitle = $('title').text() || 
                       $('h1').first().text() || 
                       path.basename(filePath, '.html');

      // 5. Generate URL from file path
      const url = this.generateUrl(filePath);

      // 6. Split content by headings (h2, h3)
      const documents: Document[] = [];
      const headings = $content.find('h2, h3').toArray();

      if (headings.length === 0) {
        // No headings, extract entire content as one document
        const content = this.extractTextContent($content);
        if (content.trim().length > 0) {
          documents.push({
            id: this.generateId(filePath),
            title: pageTitle,
            content: this.truncateContent(content, this.options.maxDocumentLength),
            url,
            metadata: {
              lastModified: fileStats.mtime,
            },
          });
        }
      } else {
        // Split by headings
        for (let i = 0; i < headings.length; i++) {
          const heading = $(headings[i]);
          const headingText = heading.text().trim();
          const headingId = heading.attr('id') || this.slugify(headingText);

          // Get content between this heading and the next
          let $section = heading.nextUntil('h2, h3');
          
          // If this is an h3, also include until next h2
          if (heading.is('h3') && i + 1 < headings.length) {
            const nextHeading = $(headings[i + 1]);
            if (nextHeading.is('h2')) {
              $section = heading.nextUntil('h2');
            }
          }

          const sectionContent = this.extractTextContent($section);
          
          if (sectionContent.trim().length > 0) {
            documents.push({
              id: this.generateId(`${filePath}#${headingId}`),
              title: `${pageTitle} - ${headingText}`,
              content: this.truncateContent(sectionContent, this.options.maxDocumentLength),
              url: `${url}#${headingId}`,
              metadata: {
                section: headingText,
                lastModified: fileStats.mtime,
              },
            });
          }
        }

        // Also add content before first heading
        const $beforeFirst = $content.children().first().nextUntil('h2, h3');
        const beforeContent = this.extractTextContent($beforeFirst);
        if (beforeContent.trim().length > 100) {
          documents.unshift({
            id: this.generateId(filePath),
            title: pageTitle,
            content: this.truncateContent(beforeContent, this.options.maxDocumentLength),
            url,
            metadata: {
              lastModified: fileStats.mtime,
            },
          });
        }
      }

      this.logger.debug(`Extracted ${documents.length} chunks from: ${filePath}`);
      return documents;

    } catch (error) {
      this.logger.error(`Failed to extract from HTML: ${filePath}`, error as Error);
      return [];
    }
  }

  /**
   * Extract multiple documents in batch.
   */
  async extractBatch(filePaths: string[]): Promise<Document[]> {
    this.logger.info(`Extracting from ${filePaths.length} HTML files`);
    const allDocuments: Document[] = [];

    for (let i = 0; i < filePaths.length; i++) {
      const docs = await this.extract(filePaths[i]);
      allDocuments.push(...docs);

      if ((i + 1) % 10 === 0) {
        this.logger.debug(`Progress: ${i + 1}/${filePaths.length} files processed`);
      }
    }

    this.logger.info(`Successfully extracted ${allDocuments.length} document chunks from ${filePaths.length} files`);
    return allDocuments;
  }

  /**
   * Extract plain text from cheerio elements.
   */
  private extractTextContent($elements: any): string {
    // Remove script, style, nav, footer elements
    $elements.find('script, style, nav, footer, .navbar, .sidebar').remove();
    
    // Get text and normalize whitespace
    return $elements
      .text()
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Truncate content if it exceeds max length.
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }

    // Truncate at sentence boundary if possible
    const truncated = content.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('. ');
    
    if (lastPeriod > maxLength * 0.8) {
      return truncated.substring(0, lastPeriod + 1);
    }

    return truncated;
  }

  /**
   * Generate a unique ID for a document.
   */
  private generateId(identifier: string): string {
    return crypto.createHash('md5').update(identifier).digest('hex');
  }

  /**
   * Generate URL from file path.
   */
  private generateUrl(filePath: string): string {
    // Extract relative path from build directory
    const parts = filePath.split('/build/');
    if (parts.length < 2) {
      return '/';
    }

    let urlPath = parts[1]
      .replace(/\.html$/, '')
      .replace(/\/index$/, '')
      .replace(/\\/g, '/');

    if (!urlPath.startsWith('/')) {
      urlPath = '/' + urlPath;
    }

    return path.posix.join(this.options.baseUrl, urlPath);
  }

  /**
   * Create URL-friendly slug from text.
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}
