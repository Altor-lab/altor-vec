import { useState, useCallback, useRef } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { BaseResult, Metadata, Bm25Data } from './types';

export function useBm25Search() {
  const { siteConfig } = useDocusaurusContext();
  const baseUrl = siteConfig.baseUrl;
  
  const [isReady, setIsReady] = useState(false);
  const bm25DataRef = useRef<Bm25Data | null>(null);
  const metadataRef = useRef<Metadata | null>(null);
  const loadingPromiseRef = useRef<Promise<void> | null>(null);

  const ensureLoaded = useCallback(async (): Promise<void> => {
    if (bm25DataRef.current && metadataRef.current) return;
    if (loadingPromiseRef.current) return loadingPromiseRef.current;

    loadingPromiseRef.current = (async () => {
      try {
        const [bm25, meta] = await Promise.all([
          fetch(`${baseUrl}search/bm25.json`).then(r => r.json()),
          fetch(`${baseUrl}search/metadata.json`).then(r => r.json())
        ]);
        bm25DataRef.current = bm25;
        metadataRef.current = meta;
        setIsReady(true);
      } catch (err) {
        loadingPromiseRef.current = null;
        console.error('Failed to load BM25 data:', err);
      }
    })();

    return loadingPromiseRef.current;
  }, [baseUrl]);

  const search = useCallback(async (query: string): Promise<BaseResult[]> => {
    await ensureLoaded();
    const bm25Data = bm25DataRef.current;
    const metadata = metadataRef.current;
    if (!bm25Data || !metadata || !query.trim()) return [];

    const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
    const scores = new Map<number, number>();
    
    const k1 = 1.2;
    const b = 0.75;
    const N = bm25Data.totalDocs;
    const avgdl = bm25Data.avgdl;

    for (const term of terms) {
      const postings = bm25Data.invertedIndex[term] || [];
      const df = postings.length;
      if (df === 0) continue;

      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

      for (const { docId, tf } of postings) {
        const dl = bm25Data.docLengths[docId] || avgdl;
        const score = idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl / avgdl));
        scores.set(docId, (scores.get(docId) || 0) + score);
      }
    }

    const results: BaseResult[] = [];
    for (const [docId, score] of scores.entries()) {
      const doc = metadata.find(d => d.id === docId);
      if (doc) {
        results.push({ ...doc, score });
      }
    }

    return results.sort((a, bItem) => bItem.score - a.score).slice(0, 20);
  }, [ensureLoaded]);

  return { search, isReady, ensureLoaded };
}
