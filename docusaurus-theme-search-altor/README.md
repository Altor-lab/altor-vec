# docusaurus-theme-search-altor

Fast client-side semantic search for Docusaurus, powered by altor-vec.

## Install in under 5 minutes

### 1) Install the package

```bash
npm install docusaurus-theme-search-altor
```

### 2) Add the theme

```js
// docusaurus.config.js
module.exports = {
  themes: ['docusaurus-theme-search-altor'],
};
```

### 3) Configure search

```js
// docusaurus.config.js
module.exports = {
  themes: ['docusaurus-theme-search-altor'],
  themeConfig: {
    altorSearch: {
      searchPagePath: 'search',
      embeddingModel: 'all-MiniLM-L6-v2',
      embeddingApiUrl: 'https://cursor-worker.fly.dev',
      maxResultsPerQuery: 8,
      hnsw: {
        m: 16,
        efConstruction: 200,
        efSearch: 50,
      },
      placeholder: 'Search docs...',
      keyboardShortcut: true,
    },
  },
};
```

Build your site, ship the generated index, and search is ready. BM25 keyword search runs fully client-side. Semantic vector search requires a running embedding API to convert queries into vectors at search time.

## Configuration reference

### Theme config: `themeConfig.altorSearch`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `searchPagePath` | `string \| false` | `'search'` | Route for the built-in search page. Set to `false` to disable it. |
| `embeddingModel` | `string` | `'all-MiniLM-L6-v2'` | Embedding model name sent to your embedding service during index generation. |
| `embeddingApiUrl` | `string` | `'https://cursor-worker.fly.dev'` | HTTP endpoint for embedding generation. Used at **build time** (index creation) and at **runtime** (query embedding for semantic search). Must be accessible from both your CI and your users' browsers. A hosted instance is provided by default. |
| `maxResultsPerQuery` | `number` | `8` | Maximum client-side results returned for each query. |
| `hnsw.m` | `number` | `16` | HNSW graph connectivity parameter for index construction. |
| `hnsw.efConstruction` | `number` | `200` | HNSW build-time candidate list size. |
| `hnsw.efSearch` | `number` | `50` | HNSW search-time candidate list size. |
| `placeholder` | `string` | `'Search docs...'` | Placeholder text shown in the search trigger and modal input. |
| `keyboardShortcut` | `boolean` | `true` | Enables the platform-aware open-search shortcut (`⌘K` on macOS, `Ctrl K` elsewhere). |

All public runtime configuration lives under `themeConfig.altorSearch`.

## How it works

1. During `docusaurus build`, the theme extracts your site content, calls the embedding API to generate vectors, and builds HNSW + BM25 indexes.
2. The indexes are written into the built site as static assets (`search/index.bin`, `search/metadata.json`, `search/bm25.json`).
3. In the browser:
   - **BM25 keyword search** runs fully client-side with zero external calls.
   - **Semantic vector search** sends the query to your `embeddingApiUrl` to get a vector, then searches the HNSW index client-side via altor-vec WASM.

The embedding API is required at both build time and runtime. You can host it yourself (see `embed-api/` in the repo) or use any OpenAI-compatible embedding endpoint. If the API is unreachable, search gracefully degrades to BM25 keyword results only.

## Comparison

| Feature | `docusaurus-theme-search-altor` | Algolia DocSearch | `docusaurus-search-local` |
| --- | --- | --- | --- |
| Runtime dependency | Embedding API for semantic search (BM25 works standalone) | Algolia SaaS | None beyond static assets |
| Search quality | Hybrid BM25 + vector semantic search | Keyword search with hosted ranking | Local keyword search |
| Setup time | Minutes if you already have an embedding API | Fast if you qualify for DocSearch, otherwise account setup required | Fast |
| Offline/self-hosted runtime | Yes | No | Yes |
| Privacy | Queries stay in the browser | Queries go to Algolia | Queries stay in the browser |
| Best fit | Teams that want hybrid semantic + keyword search with a lightweight API | Teams that want a managed search product | Teams that only need local keyword search |

## Powered by altor-vec

This package uses the altor-vec WASM vector engine for client-side semantic retrieval.

- Main repo: https://github.com/Altor-lab/altor-vec

## License

MIT
