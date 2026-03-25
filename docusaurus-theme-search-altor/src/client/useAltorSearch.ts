import { useState, useCallback, useRef } from 'react';
import { useBm25Search } from './useBm25Search';
import { useVectorSearch } from './useVectorSearch';
import { mergeRRF } from './mergeResults';
import { SearchResult } from './types';

export function useAltorSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  const { search: searchBm25, ensureLoaded: ensureBm25Loaded } = useBm25Search();
  const { search: searchVector, isReady: isVectorReady } = useVectorSearch();

  const search = useCallback(async (q: string) => {
    const currentRequestId = ++requestIdRef.current;
    setQuery(q);

    if (!q.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      await ensureBm25Loaded();
      const bm25Results = await searchBm25(q);

      if (currentRequestId !== requestIdRef.current) return;
      setResults(bm25Results.map(r => ({ ...r, source: 'bm25' as const })));

      if (isVectorReady) {
        const vectorResults = await searchVector(q);
        if (currentRequestId !== requestIdRef.current) return;
        const merged = mergeRRF(bm25Results, vectorResults);
        setResults(merged);
      }
    } catch (error) {
      if (currentRequestId !== requestIdRef.current) return;
      console.error('Search error:', error);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [searchBm25, searchVector, isVectorReady, ensureBm25Loaded]);

  return { search, results, isLoading, query };
}
