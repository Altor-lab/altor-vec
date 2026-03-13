# Monorepo Refactoring Plan: Shared Core Architecture

**Date**: March 12, 2026  
**Objective**: Refactor the monorepo to extract shared logic into a core package, enabling both Docusaurus and VitePress plugins to reuse common functionality.

---

## 📊 Executive Summary

### Current Architecture
```
packages/
└── docusaurus-plugin-altor-vec/
    ├── src/
    │   ├── indexer/          # Build-time logic
    │   ├── embeddings/       # Embedding providers
    │   ├── utils/            # Utilities
    │   ├── worker/           # Search worker
    │   ├── ui/               # React components
    │   └── plugin/           # Docusaurus-specific
    └── package.json
```

### Target Architecture
```
packages/
├── altor-vec-core/                    # 🆕 Shared core (platform-agnostic)
│   ├── src/
│   │   ├── indexer/                   # ♻️ Moved from docusaurus plugin
│   │   ├── embeddings/                # ♻️ Moved from docusaurus plugin
│   │   ├── utils/                     # ♻️ Moved from docusaurus plugin
│   │   ├── worker/                    # ♻️ Moved from docusaurus plugin
│   │   └── types/                     # ♻️ Moved from docusaurus plugin
│   └── package.json
│
├── altor-vec-search-ui/               # 🆕 Shared search UI logic (framework-agnostic)
│   ├── src/
│   │   ├── SearchEngine.ts            # 🆕 WASM + worker management
│   │   ├── SearchState.ts             # 🆕 State management (vanilla JS)
│   │   └── types.ts                   # 🆕 UI types
│   └── package.json
│
├── docusaurus-plugin-altor-vec/       # ✂️ Refactored (thin wrapper)
│   ├── src/
│   │   ├── plugin/                    # Docusaurus lifecycle hooks
│   │   └── ui/                        # React components (uses search-ui)
│   └── package.json
│
└── vitepress-plugin-altor-vec/        # 🆕 New plugin
    ├── src/
    │   ├── plugin/                    # Vite plugin hooks
    │   └── ui/                        # Vue components (uses search-ui)
    └── package.json
```

---

## 🎯 Search Component Architecture

### Question: Where should the search component live?

**Answer**: **Hybrid approach** - Shared logic + Framework-specific UI

### Architecture Decision

```
┌─────────────────────────────────────────────────────────────┐
│                    Search Architecture                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  altor-vec-search-ui (Framework-Agnostic)          │    │
│  │  ─────────────────────────────────────────────     │    │
│  │  • SearchEngine.ts    - WASM initialization        │    │
│  │  • SearchState.ts     - State management           │    │
│  │  • SearchWorker.ts    - Web Worker logic           │    │
│  │  • types.ts           - Shared types               │    │
│  └────────────────────────────────────────────────────┘    │
│                           ▲                                  │
│                           │                                  │
│           ┌───────────────┴───────────────┐                │
│           │                               │                 │
│  ┌────────▼────────┐           ┌─────────▼────────┐       │
│  │  React Wrapper  │           │   Vue Wrapper     │       │
│  │  ─────────────  │           │   ───────────     │       │
│  │  SearchBar.tsx  │           │   SearchBar.vue   │       │
│  │  (Docusaurus)   │           │   (VitePress)     │       │
│  └─────────────────┘           └──────────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Why This Approach?

✅ **Shared Logic** (80% reuse)
- WASM initialization
- Worker management
- Search state
- Result processing

✅ **Framework-Specific UI** (20% custom)
- React hooks vs Vue composition API
- Component lifecycle
- Styling integration
- Theme compatibility

---

## 📦 Package Structure Details

### 1. `altor-vec-core`

**Purpose**: Platform-agnostic build-time logic

**Contents**:
```
packages/altor-vec-core/
├── src/
│   ├── indexer/
│   │   ├── ContentExtractor.ts       # Markdown content extraction
│   │   └── IndexBuilder.ts           # HNSW index building
│   ├── embeddings/
│   │   └── EmbeddingProvider.ts      # Transformers.js + OpenAI
│   ├── utils/
│   │   ├── config.ts                 # Config validation
│   │   ├── Logger.ts                 # Logging
│   │   ├── PluginError.ts            # Error handling
│   │   └── compatibility.ts          # Version checks
│   ├── worker/
│   │   └── searchWorker.ts           # Web Worker for search
│   └── types/
│       └── index.ts                  # Shared types
├── package.json
├── tsconfig.json
└── README.md
```

**Dependencies**:
```json
{
  "name": "@altor-vec/core",
  "version": "0.1.0",
  "dependencies": {
    "altor-vec": "^0.1.3",
    "@huggingface/transformers": "^3.8.1",
    "gray-matter": "^4.0.3",
    "glob": "^10.3.10"
  },
  "peerDependencies": {}
}
```

**Exports**:
```typescript
// Main exports
export { ContentExtractor } from './indexer/ContentExtractor';
export { HnswIndexBuilder } from './indexer/IndexBuilder';
export { EmbeddingProvider } from './embeddings/EmbeddingProvider';
export { validateAndMergeOptions, sanitizeConfig } from './utils/config';
export { Logger, createLogger } from './utils/Logger';
export { PluginError } from './utils/PluginError';
export * from './types';
```

---

### 2. `altor-vec-search-ui`

**Purpose**: Framework-agnostic search UI logic

**Contents**:
```
packages/altor-vec-search-ui/
├── src/
│   ├── SearchEngine.ts               # WASM + worker management
│   ├── SearchState.ts                # State management (vanilla)
│   ├── SearchWorkerManager.ts        # Worker lifecycle
│   └── types.ts                      # UI-specific types
├── package.json
├── tsconfig.json
└── README.md
```

**Key Files**:

#### `SearchEngine.ts`
```typescript
export class SearchEngine {
  private worker: Worker | null = null;
  private isReady = false;
  
  async initialize(config: SearchConfig): Promise<void> {
    // Initialize worker
    // Load WASM
    // Load index
    // Load embeddings
  }
  
  async search(query: string, topK: number): Promise<SearchResult[]> {
    // Send to worker
    // Return results
  }
  
  destroy(): void {
    // Cleanup
  }
}
```

#### `SearchState.ts`
```typescript
export class SearchState {
  private listeners: Set<StateListener> = new Set();
  
  state = {
    query: '',
    results: [],
    isLoading: false,
    error: null,
  };
  
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  updateQuery(query: string): void {
    this.state.query = query;
    this.notify();
  }
  
  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}
```

**Dependencies**:
```json
{
  "name": "@altor-vec/search-ui",
  "version": "0.1.0",
  "dependencies": {
    "@altor-vec/core": "workspace:*",
    "altor-vec": "^0.1.3"
  },
  "peerDependencies": {}
}
```

---

### 3. `docusaurus-plugin-altor-vec` (Refactored)

**Purpose**: Docusaurus-specific wrapper

**Contents**:
```
packages/docusaurus-plugin-altor-vec/
├── src/
│   ├── plugin/
│   │   └── index.ts                  # Docusaurus lifecycle hooks
│   └── ui/
│       └── SearchBar.tsx             # React component
├── package.json
├── tsconfig.json
└── README.md
```

**Dependencies**:
```json
{
  "name": "docusaurus-plugin-altor-vec",
  "version": "0.1.0",
  "dependencies": {
    "@altor-vec/core": "workspace:*",
    "@altor-vec/search-ui": "workspace:*"
  },
  "peerDependencies": {
    "@docusaurus/core": "^3.0.0",
    "react": "^18.0.0"
  }
}
```

**Plugin Code** (simplified):
```typescript
import { ContentExtractor, HnswIndexBuilder, EmbeddingProvider } from '@altor-vec/core';

export default function plugin(context, options) {
  return {
    name: 'docusaurus-plugin-altor-vec',
    
    async contentLoaded({ actions }) {
      // Use shared core
      const extractor = new ContentExtractor(options);
      const documents = await extractor.extract();
      
      const provider = new EmbeddingProvider(options);
      const embeddings = await provider.generateBatch(documents);
      
      const builder = new HnswIndexBuilder(options);
      const artifacts = await builder.build(documents, embeddings);
      
      // Write index files
      await writeIndexFiles(artifacts);
    },
  };
}
```

**React Component**:
```tsx
import React, { useEffect, useState } from 'react';
import { SearchEngine, SearchState } from '@altor-vec/search-ui';

export function SearchBar() {
  const [state, setState] = useState({ query: '', results: [] });
  const [engine] = useState(() => new SearchEngine());
  
  useEffect(() => {
    const searchState = new SearchState();
    const unsubscribe = searchState.subscribe(setState);
    
    engine.initialize(config).then(() => {
      // Ready
    });
    
    return () => {
      unsubscribe();
      engine.destroy();
    };
  }, []);
  
  return (
    <input 
      value={state.query}
      onChange={e => handleSearch(e.target.value)}
    />
  );
}
```

---

### 4. `vitepress-plugin-altor-vec` (New)

**Purpose**: VitePress-specific wrapper

**Contents**:
```
packages/vitepress-plugin-altor-vec/
├── src/
│   ├── plugin/
│   │   └── index.ts                  # Vite plugin hooks
│   └── ui/
│       └── SearchBar.vue             # Vue component
├── package.json
├── tsconfig.json
└── README.md
```

**Dependencies**:
```json
{
  "name": "vitepress-plugin-altor-vec",
  "version": "0.1.0",
  "dependencies": {
    "@altor-vec/core": "workspace:*",
    "@altor-vec/search-ui": "workspace:*"
  },
  "peerDependencies": {
    "vitepress": "^1.0.0",
    "vue": "^3.0.0"
  }
}
```

**Plugin Code**:
```typescript
import type { Plugin } from 'vite';
import { ContentExtractor, HnswIndexBuilder, EmbeddingProvider } from '@altor-vec/core';

export default function vitePluginAltorVec(options): Plugin {
  return {
    name: 'vite-plugin-altor-vec',
    
    async buildStart() {
      // Same logic as Docusaurus, using shared core
      const extractor = new ContentExtractor(options);
      const documents = await extractor.extract();
      
      const provider = new EmbeddingProvider(options);
      const embeddings = await provider.generateBatch(documents);
      
      const builder = new HnswIndexBuilder(options);
      const artifacts = await builder.build(documents, embeddings);
      
      // Write to .vitepress/dist/
      await writeIndexFiles(artifacts);
    },
  };
}
```

**Vue Component**:
```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { SearchEngine, SearchState } from '@altor-vec/search-ui';

const query = ref('');
const results = ref([]);

let engine: SearchEngine;
let searchState: SearchState;
let unsubscribe: () => void;

onMounted(async () => {
  engine = new SearchEngine();
  searchState = new SearchState();
  
  unsubscribe = searchState.subscribe((state) => {
    query.value = state.query;
    results.value = state.results;
  });
  
  await engine.initialize(config);
});

onUnmounted(() => {
  unsubscribe?.();
  engine?.destroy();
});
</script>

<template>
  <input v-model="query" @input="handleSearch" />
</template>
```

---

## 🔄 Migration Steps

### Phase 1: Create Core Package (2 hours)

**Step 1.1: Create package structure**
```bash
mkdir -p packages/altor-vec-core/src/{indexer,embeddings,utils,worker,types}
cd packages/altor-vec-core
npm init -y
```

**Step 1.2: Move files from Docusaurus plugin**
```bash
# From packages/docusaurus-plugin-altor-vec/src/
mv indexer/* ../altor-vec-core/src/indexer/
mv embeddings/* ../altor-vec-core/src/embeddings/
mv utils/* ../altor-vec-core/src/utils/
mv worker/* ../altor-vec-core/src/worker/
mv types/* ../altor-vec-core/src/types/
```

**Step 1.3: Update imports in moved files**
```typescript
// Before
import { Logger } from '../utils/Logger';

// After
import { Logger } from '../utils/Logger';  // Same (relative imports work)
```

**Step 1.4: Create package.json**
```json
{
  "name": "@altor-vec/core",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

**Step 1.5: Create index.ts**
```typescript
export * from './indexer/ContentExtractor';
export * from './indexer/IndexBuilder';
export * from './embeddings/EmbeddingProvider';
export * from './utils/config';
export * from './utils/Logger';
export * from './utils/PluginError';
export * from './types';
```

**Step 1.6: Build core package**
```bash
cd packages/altor-vec-core
npm run build
```

---

### Phase 2: Create Search UI Package (2 hours)

**Step 2.1: Create package structure**
```bash
mkdir -p packages/altor-vec-search-ui/src
cd packages/altor-vec-search-ui
npm init -y
```

**Step 2.2: Create SearchEngine.ts**
```typescript
import type { SearchConfig, SearchResult } from './types';

export class SearchEngine {
  private worker: Worker | null = null;
  private isReady = false;
  
  async initialize(config: SearchConfig): Promise<void> {
    // Create worker
    this.worker = new Worker(
      new URL('@altor-vec/core/worker/searchWorker', import.meta.url),
      { type: 'module' }
    );
    
    // Wait for ready
    return new Promise((resolve, reject) => {
      this.worker!.onmessage = (e) => {
        if (e.data.type === 'ready') {
          this.isReady = true;
          resolve();
        } else if (e.data.type === 'error') {
          reject(new Error(e.data.message));
        }
      };
      
      this.worker!.postMessage({ type: 'init', config });
    });
  }
  
  async search(query: string, topK = 5): Promise<SearchResult[]> {
    if (!this.isReady || !this.worker) {
      throw new Error('SearchEngine not initialized');
    }
    
    return new Promise((resolve, reject) => {
      this.worker!.onmessage = (e) => {
        if (e.data.type === 'results') {
          resolve(e.data.results);
        } else if (e.data.type === 'error') {
          reject(new Error(e.data.message));
        }
      };
      
      this.worker!.postMessage({ type: 'search', query, topK });
    });
  }
  
  destroy(): void {
    this.worker?.terminate();
    this.worker = null;
    this.isReady = false;
  }
}
```

**Step 2.3: Create SearchState.ts**
```typescript
export interface SearchStateData {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  error: Error | null;
}

export type StateListener = (state: SearchStateData) => void;

export class SearchState {
  private listeners: Set<StateListener> = new Set();
  
  state: SearchStateData = {
    query: '',
    results: [],
    isLoading: false,
    error: null,
  };
  
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state); // Initial call
    return () => this.listeners.delete(listener);
  }
  
  updateQuery(query: string): void {
    this.state = { ...this.state, query };
    this.notify();
  }
  
  setLoading(isLoading: boolean): void {
    this.state = { ...this.state, isLoading };
    this.notify();
  }
  
  setResults(results: SearchResult[]): void {
    this.state = { ...this.state, results, isLoading: false, error: null };
    this.notify();
  }
  
  setError(error: Error): void {
    this.state = { ...this.state, error, isLoading: false };
    this.notify();
  }
  
  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}
```

**Step 2.4: Build search-ui package**
```bash
cd packages/altor-vec-search-ui
npm run build
```

---

### Phase 3: Refactor Docusaurus Plugin (1 hour)

**Step 3.1: Update package.json**
```json
{
  "dependencies": {
    "@altor-vec/core": "workspace:*",
    "@altor-vec/search-ui": "workspace:*"
  }
}
```

**Step 3.2: Update plugin/index.ts**
```typescript
import { 
  ContentExtractor, 
  HnswIndexBuilder, 
  EmbeddingProvider,
  validateAndMergeOptions,
  createLogger
} from '@altor-vec/core';

export default function plugin(context, options) {
  const validatedOptions = validateAndMergeOptions(options);
  const logger = createLogger(validatedOptions.logLevel);
  
  return {
    name: 'docusaurus-plugin-altor-vec',
    
    async contentLoaded({ actions }) {
      const extractor = new ContentExtractor(validatedOptions, logger);
      const documents = await extractor.extract();
      
      const provider = new EmbeddingProvider(validatedOptions, logger);
      const embeddings = await provider.generateBatch(documents);
      
      const builder = new HnswIndexBuilder(
        validatedOptions.hnswM,
        validatedOptions.hnswEfConstruction,
        validatedOptions.hnswEfSearch,
        logger
      );
      const artifacts = await builder.build(documents, embeddings);
      
      // Write files (same as before)
    },
  };
}
```

**Step 3.3: Update SearchBar.tsx**
```tsx
import React, { useEffect, useState } from 'react';
import { SearchEngine, SearchState } from '@altor-vec/search-ui';
import type { SearchStateData } from '@altor-vec/search-ui';

export function SearchBar() {
  const [state, setState] = useState<SearchStateData>({
    query: '',
    results: [],
    isLoading: false,
    error: null,
  });
  
  const [engine] = useState(() => new SearchEngine());
  const [searchState] = useState(() => new SearchState());
  
  useEffect(() => {
    const unsubscribe = searchState.subscribe(setState);
    
    engine.initialize({
      indexPath: '__altor-vec__',
      embeddingModel: 'Xenova/all-MiniLM-L6-v2',
      embeddingDimensions: 384,
    }).catch(err => {
      searchState.setError(err);
    });
    
    return () => {
      unsubscribe();
      engine.destroy();
    };
  }, []);
  
  const handleSearch = async (query: string) => {
    searchState.updateQuery(query);
    
    if (!query.trim()) {
      searchState.setResults([]);
      return;
    }
    
    searchState.setLoading(true);
    
    try {
      const results = await engine.search(query, 5);
      searchState.setResults(results);
    } catch (err) {
      searchState.setError(err as Error);
    }
  };
  
  return (
    <div>
      <input 
        value={state.query}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Search..."
      />
      {/* Render results */}
    </div>
  );
}
```

**Step 3.4: Test Docusaurus plugin**
```bash
cd /Users/vaibhav/altor-test-site
npm run build
```

---

### Phase 4: Create VitePress Plugin (3 hours)

**Step 4.1: Create package structure**
```bash
mkdir -p packages/vitepress-plugin-altor-vec/src/{plugin,ui}
cd packages/vitepress-plugin-altor-vec
npm init -y
```

**Step 4.2: Install dependencies**
```bash
npm install @altor-vec/core@workspace:* @altor-vec/search-ui@workspace:*
npm install -D vitepress vue typescript
```

**Step 4.3: Create plugin/index.ts**
```typescript
import type { Plugin } from 'vite';
import * as path from 'path';
import * as fs from 'fs';
import { 
  ContentExtractor, 
  HnswIndexBuilder, 
  EmbeddingProvider,
  validateAndMergeOptions,
  createLogger,
  type PluginOptions
} from '@altor-vec/core';

export default function vitePluginAltorVec(options: Partial<PluginOptions> = {}): Plugin {
  const validatedOptions = validateAndMergeOptions(options);
  const logger = createLogger(validatedOptions.logLevel);
  
  return {
    name: 'vite-plugin-altor-vec',
    
    async buildStart() {
      logger.info('Building search index...');
      
      try {
        // Extract content
        const extractor = new ContentExtractor(validatedOptions, logger);
        const documents = await extractor.extract();
        
        // Generate embeddings
        const provider = new EmbeddingProvider(validatedOptions, logger);
        await provider.initialize();
        const embeddings = await provider.generateBatch(documents);
        
        // Build index
        const builder = new HnswIndexBuilder(
          validatedOptions.hnswM,
          validatedOptions.hnswEfConstruction,
          validatedOptions.hnswEfSearch,
          logger
        );
        const artifacts = await builder.build(documents, embeddings);
        
        // Write to .vitepress/dist/__altor-vec__/
        const outputDir = path.join(process.cwd(), '.vitepress/dist', validatedOptions.indexPath);
        fs.mkdirSync(outputDir, { recursive: true });
        
        fs.writeFileSync(
          path.join(outputDir, 'index.bin'),
          artifacts.indexBytes
        );
        
        fs.writeFileSync(
          path.join(outputDir, 'metadata.json'),
          JSON.stringify(artifacts.metadata, null, 2)
        );
        
        fs.writeFileSync(
          path.join(outputDir, 'config.json'),
          JSON.stringify({
            indexPath: validatedOptions.indexPath,
            embeddingModel: validatedOptions.embeddingModel,
            embeddingDimensions: validatedOptions.embeddingDimensions,
            maxResults: validatedOptions.maxResults,
            i18n: validatedOptions.i18n,
          }, null, 2)
        );
        
        logger.info('Search index built successfully', artifacts.stats);
        
      } catch (error) {
        logger.error('Failed to build search index', error as Error);
        throw error;
      }
    },
  };
}
```

**Step 4.4: Create ui/SearchBar.vue**
```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { SearchEngine, SearchState } from '@altor-vec/search-ui';
import type { SearchStateData, SearchResult } from '@altor-vec/search-ui';

const query = ref('');
const results = ref<SearchResult[]>([]);
const isLoading = ref(false);
const error = ref<Error | null>(null);

let engine: SearchEngine;
let searchState: SearchState;
let unsubscribe: (() => void) | null = null;

onMounted(async () => {
  engine = new SearchEngine();
  searchState = new SearchState();
  
  unsubscribe = searchState.subscribe((state: SearchStateData) => {
    query.value = state.query;
    results.value = state.results;
    isLoading.value = state.isLoading;
    error.value = state.error;
  });
  
  try {
    await engine.initialize({
      indexPath: '__altor-vec__',
      embeddingModel: 'Xenova/all-MiniLM-L6-v2',
      embeddingDimensions: 384,
    });
  } catch (err) {
    searchState.setError(err as Error);
  }
});

onUnmounted(() => {
  unsubscribe?.();
  engine?.destroy();
});

const handleSearch = async (newQuery: string) => {
  searchState.updateQuery(newQuery);
  
  if (!newQuery.trim()) {
    searchState.setResults([]);
    return;
  }
  
  searchState.setLoading(true);
  
  try {
    const searchResults = await engine.search(newQuery, 5);
    searchState.setResults(searchResults);
  } catch (err) {
    searchState.setError(err as Error);
  }
};

// Debounce search
let searchTimeout: NodeJS.Timeout;
watch(query, (newQuery) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => handleSearch(newQuery), 300);
});
</script>

<template>
  <div class="altor-search">
    <input 
      v-model="query"
      type="text"
      placeholder="Search documentation..."
      class="search-input"
      :disabled="isLoading"
    />
    
    <div v-if="error" class="error">
      {{ error.message }}
    </div>
    
    <div v-if="results.length > 0" class="results">
      <a 
        v-for="result in results" 
        :key="result.id"
        :href="result.url"
        class="result-item"
      >
        <h3>{{ result.title }}</h3>
        <p>{{ result.preview }}</p>
      </a>
    </div>
    
    <div v-else-if="query && !isLoading" class="no-results">
      No results found
    </div>
  </div>
</template>

<style scoped>
.altor-search {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 14px;
}

.results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  max-height: 400px;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.result-item {
  display: block;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  text-decoration: none;
  color: inherit;
}

.result-item:hover {
  background: var(--vp-c-bg-soft);
}

.result-item h3 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
}

.result-item p {
  margin: 0;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.error {
  color: var(--vp-c-danger);
  font-size: 12px;
  margin-top: 8px;
}

.no-results {
  padding: 12px 16px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}
</style>
```

**Step 4.5: Create README.md**
```markdown
# VitePress Plugin - Altor Vec

Semantic search for VitePress documentation powered by WASM vector search.

## Installation

\`\`\`bash
npm install vitepress-plugin-altor-vec
\`\`\`

## Usage

\`\`\`.vitepress/config.ts
import { defineConfig } from 'vitepress';
import altorVecPlugin from 'vitepress-plugin-altor-vec';

export default defineConfig({
  vite: {
    plugins: [
      altorVecPlugin({
        embeddingProvider: 'transformers',
        embeddingModel: 'Xenova/all-MiniLM-L6-v2',
      }),
    ],
  },
});
\`\`\`

## Configuration

Same options as Docusaurus plugin. See [@altor-vec/core](../altor-vec-core/README.md) for details.
```

---

## 📋 Implementation Checklist

### Week 1: Core Refactoring
- [ ] Create `@altor-vec/core` package structure
- [ ] Move shared files from Docusaurus plugin
- [ ] Update all imports in moved files
- [ ] Create package.json and tsconfig.json
- [ ] Build and test core package
- [ ] Update Docusaurus plugin to use core
- [ ] Test Docusaurus plugin still works

### Week 2: Search UI Package
- [ ] Create `@altor-vec/search-ui` package structure
- [ ] Implement SearchEngine class
- [ ] Implement SearchState class
- [ ] Create types and exports
- [ ] Build and test search-ui package
- [ ] Update Docusaurus SearchBar to use search-ui
- [ ] Test search functionality in Docusaurus

### Week 3: VitePress Plugin
- [ ] Create `vitepress-plugin-altor-vec` package structure
- [ ] Implement Vite plugin hooks
- [ ] Create Vue SearchBar component
- [ ] Write VitePress-specific README
- [ ] Create test VitePress site
- [ ] Test end-to-end with VitePress
- [ ] Document VitePress usage

### Week 4: Polish & Documentation
- [ ] Update root README with both plugins
- [ ] Create migration guide
- [ ] Add examples for both plugins
- [ ] Write contributing guide
- [ ] Create GitHub issues for follow-up work
- [ ] Prepare PRs for review

---

## 🎯 Success Criteria

✅ **Core Package**
- All shared logic extracted
- Zero Docusaurus/VitePress dependencies
- Clean, documented API
- Builds successfully

✅ **Search UI Package**
- Framework-agnostic state management
- Works with both React and Vue
- Clean separation of concerns
- Well-typed API

✅ **Docusaurus Plugin**
- Uses core and search-ui packages
- All existing functionality works
- No breaking changes for users
- Tests pass

✅ **VitePress Plugin**
- Feature parity with Docusaurus
- Clean Vue 3 integration
- Works with VitePress themes
- Documentation complete

---

## 📊 Code Reuse Metrics

| Component | Lines of Code | Reused % |
|-----------|--------------|----------|
| Content Extraction | ~200 | 100% |
| Embedding Generation | ~170 | 100% |
| Index Building | ~135 | 100% |
| Config Validation | ~160 | 100% |
| Search Worker | ~150 | 100% |
| Search Engine Logic | ~200 | 100% |
| **Total Backend** | **~1015** | **100%** |
| UI Components | ~200 | 0% (framework-specific) |
| Plugin Hooks | ~100 | 0% (platform-specific) |
| **Total Frontend** | **~300** | **0%** |
| **Grand Total** | **~1315** | **~77%** |

---

## 🚀 Next Steps

1. **Review this plan** - Ensure all stakeholders agree
2. **Create GitHub issues** - Track each phase
3. **Start with Phase 1** - Core package extraction
4. **Iterate and test** - Ensure nothing breaks
5. **Document as you go** - Keep READMEs updated

---

## 📝 Notes

- **Workspace Protocol**: Use `workspace:*` for internal dependencies
- **Versioning**: Keep all packages at same version (0.1.0)
- **Testing**: Manual testing for now, automated tests in follow-up
- **Publishing**: Publish all packages together as a monorepo
- **Breaking Changes**: Avoid until v1.0.0

---

**Questions or concerns? Add them here:**

- [ ] Should we use pnpm workspaces or npm workspaces?
- [ ] Do we need a shared types package?
- [ ] Should search-ui support other frameworks (Svelte, Angular)?
- [ ] What about SSR/SSG compatibility?
