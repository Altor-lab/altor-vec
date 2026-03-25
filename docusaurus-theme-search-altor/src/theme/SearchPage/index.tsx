import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import { useHistory, useLocation } from '@docusaurus/router';
import { useAltorSearch } from '../../client/useAltorSearch';
import SearchResult from '../SearchBar/SearchResult';
import styles from '../SearchBar/styles.module.css';

export default function SearchPage(): React.ReactElement {
  const location = useLocation();
  const history = useHistory();
  const { search, results, isLoading, query } = useAltorSearch();
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    setInputValue(q);
    search(q);
  }, [location.search, search]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    
    const params = new URLSearchParams(location.search);
    if (val) {
      params.set('q', val);
    } else {
      params.delete('q');
    }
    
    history.replace({
      pathname: location.pathname,
      search: params.toString()
    });
  };

  return (
    <Layout title="Search">
      <main className="container margin-vert--lg">
        <h1>Search</h1>
        
        <div className={styles.inputContainer} style={{ border: '1px solid var(--ifm-color-emphasis-200)', borderRadius: 'var(--ifm-global-radius)', marginBottom: '2rem' }}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            className={styles.input}
            placeholder="Search documentation..."
            value={inputValue}
            onChange={handleSearch}
            autoFocus
          />
        </div>
        
        <div className={styles.results} style={{ maxHeight: 'none', padding: 0 }}>
          {query && results.length === 0 && !isLoading && (
            <div className={styles.noResults}>No results found for "{query}"</div>
          )}
          
          {results.map(result => (
            <SearchResult key={result.url} result={result} />
          ))}
        </div>
        
        <div className={styles.footer} style={{ marginTop: '2rem', background: 'transparent', borderTop: 'none' }}>
          Powered by <a href="https://github.com/altor-vec" target="_blank" rel="noopener noreferrer">altor-vec</a>
        </div>
      </main>
    </Layout>
  );
}
