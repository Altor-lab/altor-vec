import { useState, useEffect, useCallback, useRef } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { AltorSearchConfig } from '../options';
import { BaseResult, Metadata } from './types';

interface WasmEngine {
  search(query: Float32Array, topK: number): Array<{ id: number; score: number }> | string;
}

export function useVectorSearch() {
  const { siteConfig } = useDocusaurusContext();
  const baseUrl = siteConfig.baseUrl;
  const config = (siteConfig.themeConfig as Record<string, unknown>).altorSearch as AltorSearchConfig;
  
  const [isReady, setIsReady] = useState(false);
  const engineRef = useRef<WasmEngine | null>(null);
  const metadataRef = useRef<Metadata | null>(null);

  useEffect(() => {
    let mounted = true;
    
    async function load() {
      try {
        const [indexRes, metaRes, wasmModule] = await Promise.all([
          fetch(`${baseUrl}search/index.bin`),
          fetch(`${baseUrl}search/metadata.json`).then(r => r.json()),
          import('altor-vec')
        ]);
        
        const indexBuf = await indexRes.arrayBuffer();
        const { default: init, WasmSearchEngine } = wasmModule;
        
        await init();
        const searchEngine = new WasmSearchEngine(new Uint8Array(indexBuf));
        
        if (mounted) {
          engineRef.current = searchEngine;
          metadataRef.current = metaRes;
          setIsReady(true);
        }
      } catch (err) {
        console.error('Failed to load vector search:', err);
      }
    }
    
    load();
    
    return () => { mounted = false; };
  }, [baseUrl]);

  const search = useCallback(async (query: string): Promise<BaseResult[]> => {
    const engine = engineRef.current;
    const metadata = metadataRef.current;
    if (!engine || !metadata || !query.trim()) return [];

    try {
      const embeddingUrl = `${config.embeddingApiUrl}/embed`;
      const res = await fetch(embeddingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query })
      });
      
      if (!res.ok) throw new Error('Failed to fetch embedding');
      
      const data: { embedding: number[]; dims: number } = await res.json();
      const searchResult = engine.search(new Float32Array(data.embedding), config.maxResultsPerQuery || 10);
      const rawResults: Array<[number, number]> = typeof searchResult === 'string'
        ? JSON.parse(searchResult)
        : searchResult.map(r => [r.id, 1 - r.score] as [number, number]);
      
      const results: BaseResult[] = [];
      for (const [nodeId, distance] of rawResults) {
        const doc = metadata[nodeId];
        if (doc) {
          results.push({ ...doc, score: 1 - distance });
        }
      }
      return results;
    } catch (err) {
      console.error('Vector search error:', err);
      return [];
    }
  }, [config]);

  return { search, isReady };
}
