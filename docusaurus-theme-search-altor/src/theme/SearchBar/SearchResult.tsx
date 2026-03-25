import React from 'react';
import Link from '@docusaurus/Link';
import { SearchResult as SearchResultType } from '../../client/types';
import styles from './styles.module.css';

interface Props {
  result: SearchResultType;
  onClick?: () => void;
  index?: number;
  selectedIndex?: number;
  optionId?: string;
}

export default function SearchResult({ result, onClick, index, selectedIndex, optionId }: Props): React.ReactElement {
  const isSelected = index !== undefined && selectedIndex !== undefined && index === selectedIndex;

  return (
    <Link
      to={result.url}
      className={[styles.result, isSelected ? styles.resultSelected : ''].filter(Boolean).join(' ')}
      onClick={onClick}
      role={optionId ? 'option' : undefined}
      aria-selected={optionId ? isSelected : undefined}
      id={optionId}
    >
      <div className={styles.resultHeader}>
        <h3 className={styles.resultTitle}>{result.title}</h3>
        <span className={styles.resultSource}>{result.source}</span>
      </div>

      {result.headings && result.headings.length > 0 && (
        <div className={styles.resultHeadings}>
          {result.headings.map((heading, i) => (
            <span key={i}>{heading}</span>
          ))}
        </div>
      )}

      <div className={styles.resultSnippet}>
        {result.snippet.length > 160 ? `${result.snippet.substring(0, 160)}...` : result.snippet}
      </div>
    </Link>
  );
}
