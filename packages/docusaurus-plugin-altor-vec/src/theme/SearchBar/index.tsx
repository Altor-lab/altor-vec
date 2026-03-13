/**
 * Copyright (c) altor-lab
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import styles from './styles.module.css';

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  preview: string;
  score: number;
}

export interface SearchTiming {
  embedMs: string;
  searchMs: string;
  totalMs: string;
}

export interface SearchBarProps {
  placeholder?: string;
  maxResults?: number;
  debounceMs?: number;
  showTiming?: boolean;
  onResultClick?: (result: SearchResult) => void;
  renderResult?: (result: SearchResult) => React.ReactNode;
  className?: string;
  indexPath?: string;
  embeddingModel?: string;
  embeddingDimensions?: number;
  i18n?: {
    searchPlaceholder: string;
    noResults: string;
    loading: string;
    error: string;
  };
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default function SearchBar(props: SearchBarProps) {
  const {
    placeholder = 'Search documentation...',
    maxResults = 5,
    debounceMs = 300,
    showTiming = false,
    onResultClick,
    renderResult,
    className = '',
    indexPath = '__altor-vec__',
    embeddingModel = 'Xenova/all-MiniLM-L6-v2',
    embeddingDimensions = 384,
    i18n = {
      searchPlaceholder: 'Search documentation...',
      noResults: 'No results found',
      loading: 'Loading...',
      error: 'Search error',
    },
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timing, setTiming] = useState<SearchTiming | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize worker
  useEffect(() => {
    if (!isOpen) return;

    try {
      // @ts-ignore - Worker URL resolution
      workerRef.current = new Worker(
        new URL('../../worker/searchWorker.js', import.meta.url as any),
        { type: 'module' }
      );

      workerRef.current.postMessage({
        type: 'init',
        config: {
          indexPath,
          embeddingModel,
          embeddingDimensions,
        },
      });

      workerRef.current.onmessage = (e) => {
        const { type, results: searchResults, timing: searchTiming, message } = e.data;

        if (type === 'ready') {
          setError(null);
        } else if (type === 'results') {
          setResults(searchResults);
          setTiming(searchTiming);
          setIsLoading(false);
          setError(null);
          setFocusedIndex(0);
        } else if (type === 'error') {
          setError(message);
          setIsLoading(false);
        }
      };

      return () => workerRef.current?.terminate();
    } catch (err) {
      setError('Failed to initialize search worker');
      console.error('Worker initialization error:', err);
    }
  }, [isOpen, indexPath, embeddingModel, embeddingDimensions]);

  // Keyboard shortcut to open modal (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset focused index when results change
  useEffect(() => {
    setFocusedIndex(0);
  }, [results]);

  const handleSearch = useMemo(
    () =>
      debounce((searchQuery: string) => {
        if (!searchQuery.trim()) {
          setResults([]);
          setTiming(null);
          return;
        }

        setIsLoading(true);
        setError(null);
        workerRef.current?.postMessage({
          type: 'search',
          query: searchQuery,
          topK: maxResults,
        });
      }, debounceMs),
    [maxResults, debounceMs]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    handleSearch(value);
  };

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setError(null);
    setFocusedIndex(0);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      handleResultClickInternal(results[focusedIndex]);
    }
  }, [results, focusedIndex]);

  const handleResultClickInternal = (result: SearchResult) => {
    closeModal();
    if (onResultClick) {
      onResultClick(result);
    } else {
      window.location.href = result.url;
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <>
      {/* Search Button */}
      <button
        className={`${styles.searchButton} ${className}`}
        onClick={() => setIsOpen(true)}
        aria-label="Search"
      >
        <svg className={styles.searchIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className={styles.searchButtonText}>Search</span>
        <kbd className={styles.searchButtonKbd}>{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
          <div className={styles.modalContainer} ref={modalRef}>
            {/* Search Input */}
            <div className={styles.searchInputWrapper}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={styles.searchInput}
                aria-label="Search"
              />
              {isLoading ? (
                <div className={styles.loadingSpinner} />
              ) : (
                <svg className={styles.searchInputIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>

            {/* Error Message */}
            {error && <div className={styles.errorMessage}>{error}</div>}

            {/* No Results */}
            {!isLoading && query && results.length === 0 && !error && (
              <div className={styles.noResults}>
                <svg className={styles.noResultsIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className={styles.noResultsText}>{i18n.noResults}</div>
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className={styles.resultsContainer}>
                {results.map((result, index) => (
                  <div
                    key={result.id}
                    className={`${styles.searchResult} ${index === focusedIndex ? styles.focused : ''}`}
                    onClick={() => handleResultClickInternal(result)}
                    onMouseEnter={() => setFocusedIndex(index)}
                  >
                    {renderResult ? (
                      renderResult(result)
                    ) : (
                      <>
                        <div className={styles.resultTitle}>{result.title}</div>
                        <div className={styles.resultPreview}>{result.preview}</div>
                        {showTiming && (
                          <div className={styles.resultScore}>
                            Score: {result.score.toFixed(3)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Timing Display */}
            {showTiming && timing && (
              <div className={styles.timingDisplay}>
                Embed: {timing.embedMs}ms | Search: {timing.searchMs}ms | Total: {timing.totalMs}ms
              </div>
            )}

            {/* Footer */}
            <div className={styles.modalFooter}>
              <div className={styles.keyboardHints}>
                <div className={styles.keyboardHint}>
                  <kbd className={styles.keyboardHintKey}>↑</kbd>
                  <kbd className={styles.keyboardHintKey}>↓</kbd>
                  <span>Navigate</span>
                </div>
                <div className={styles.keyboardHint}>
                  <kbd className={styles.keyboardHintKey}>↵</kbd>
                  <span>Select</span>
                </div>
                <div className={styles.keyboardHint}>
                  <kbd className={styles.keyboardHintKey}>Esc</kbd>
                  <span>Close</span>
                </div>
              </div>
              <div className={styles.poweredBy}>
                Powered by{' '}
                <a
                  href="https://github.com/altor-lab/altor-vec"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.poweredByLink}
                >
                  altor-vec
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
