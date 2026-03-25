export interface SearchResult {
  id: number;
  title: string;
  url: string;
  snippet: string;
  headings: string[];
  score: number;
  source: 'bm25' | 'vector' | 'hybrid';
}

export interface BaseResult {
  id: number;
  title: string;
  url: string;
  snippet: string;
  headings: string[];
  score: number;
}

export type Metadata = {
  id: number;
  title: string;
  url: string;
  snippet: string;
  headings: string[];
}[];

export interface Bm25Data {
  invertedIndex: Record<string, { docId: number; tf: number }[]>;
  docLengths: Record<number, number>;
  avgdl: number;
  totalDocs: number;
}
