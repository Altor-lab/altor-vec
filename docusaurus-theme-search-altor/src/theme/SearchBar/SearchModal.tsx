import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHistory } from '@docusaurus/router';
import { useAltorSearch } from '../../client/useAltorSearch';
import SearchResult from './SearchResult';
import styles from './styles.module.css';

interface Props {
  onClose: () => void;
}

export default function SearchModal({ onClose }: Props): React.ReactElement | null {
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const history = useHistory();
  const { search, results, isLoading, query } = useAltorSearch();
  const [inputValue, setInputValue] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const resultsListId = 'altor-search-results';

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (mounted && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mounted]);

  useEffect(() => {
    const timer = setTimeout(() => {
      search(inputValue);
    }, 200);

    return () => clearTimeout(timer);
  }, [inputValue, search]);

  useEffect(() => {
    setSelectedIndex(results.length > 0 ? 0 : -1);
  }, [results]);

  const getResultId = (resultId: number, index: number): string => `altor-search-result-${resultId}-${index}`;

  const selectedResult = selectedIndex >= 0 ? results[selectedIndex] : undefined;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (results.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex(current => (current + 1) % results.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex(current => (current <= 0 ? results.length - 1 : current - 1));
      return;
    }

    if (event.key === 'Enter' && selectedResult) {
      event.preventDefault();
      history.push(selectedResult.url);
      onClose();
    }
  };

  const activeDescendantId = selectedResult
    ? getResultId(selectedResult.id, selectedIndex)
    : undefined;

  if (!mounted) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.inputContainer}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="Search documentation..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            aria-label="Search"
            aria-controls={resultsListId}
            aria-activedescendant={activeDescendantId}
          />
        </div>

        <div className={styles.results} role="listbox" id={resultsListId}>
          {query && results.length === 0 && !isLoading && (
            <div className={styles.noResults}>No results found for "{query}"</div>
          )}

          {results.map((result, index) => (
            <SearchResult
              key={result.id}
              result={result}
              index={index}
              selectedIndex={selectedIndex}
              optionId={getResultId(result.id, index)}
              onClick={onClose}
            />
          ))}
        </div>

        <div className={styles.footer}>
          Powered by <a href="https://github.com/altor-vec" target="_blank" rel="noopener noreferrer">altor-vec</a>
        </div>
      </div>
    </div>,
    document.body
  );
}
