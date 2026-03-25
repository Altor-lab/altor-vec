import { BaseResult, SearchResult } from './types';

export function mergeRRF(bm25: BaseResult[], vector: BaseResult[], k = 60): SearchResult[] {
  const scores = new Map<number, { score: number; doc: BaseResult; source: 'bm25' | 'vector' | 'hybrid' }>();

  bm25.forEach((res, rank) => {
    scores.set(res.id, {
      score: 1 / (k + rank + 1),
      doc: res,
      source: 'bm25'
    });
  });

  vector.forEach((res, rank) => {
    const existing = scores.get(res.id);
    if (existing) {
      existing.score += 1 / (k + rank + 1);
      existing.source = 'hybrid';
    } else {
      scores.set(res.id, {
        score: 1 / (k + rank + 1),
        doc: res,
        source: 'vector'
      });
    }
  });

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map(item => ({
      ...item.doc,
      score: item.score,
      source: item.source
    }));
}
