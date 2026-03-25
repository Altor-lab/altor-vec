export interface AltorSearchOptions {
  indexDocs?: boolean;
  indexBlog?: boolean;
  indexPages?: boolean;
}

export interface AltorSearchConfig {
  searchPagePath: string | false;
  embeddingModel: string;
  embeddingApiUrl: string;
  maxResultsPerQuery: number;
  hnsw: { m: number; efConstruction: number; efSearch: number };
  placeholder: string;
  keyboardShortcut: boolean;
}

export interface DocEntry {
  id: number;
  title: string;
  url: string;
  content: string;
  headings: string[];
  snippet: string;
  type: 'docs' | 'blog' | 'page';
}
