<p align="center">
  <h1 align="center">altor-vec</h1>
  <p align="center"><b>Client-side vector search. Rust + WASM. 54KB. Sub-millisecond.</b></p>
  <p align="center">
    <a href="https://www.npmjs.com/package/altor-vec"><img src="https://img.shields.io/npm/v/altor-vec?color=blue&label=npm" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/altor-vec"><img src="https://img.shields.io/npm/dm/altor-vec?color=green" alt="npm downloads"></a>
    <a href="https://github.com/altor-lab/altor-vec/actions/workflows/ci.yml"><img src="https://github.com/altor-lab/altor-vec/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
    <a href="https://github.com/altor-lab/altor-vec/stargazers"><img src="https://img.shields.io/github/stars/altor-lab/altor-vec?style=social" alt="GitHub stars"></a>
    <a href="https://github.com/altor-lab/altor-vec/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License"></a>
    <img src="https://img.shields.io/badge/WASM-54KB_gzipped-orange" alt="WASM size">
  </p>
  <p align="center">
    <a href="https://altorlab.dev"><img src="https://img.shields.io/badge/%F0%9F%9A%80_Docs_%26_Demo-altorlab.dev-blueviolet?style=for-the-badge" alt="Docs & Demo"></a>
  </p>
</p>

---

**Zero server. Zero API keys. Zero per-query cost. Your users' data never leaves their browser.**

altor-vec is an HNSW vector similarity search engine written in Rust that compiles to 54KB of WebAssembly. Search 10,000 vectors in under 1ms — entirely client-side.

## Is this for you?

- **Docs site** — want semantic search without Algolia DocSearch fees?
- **Using Fuse.js** — need it to understand *meaning*, not just character similarity? ("cancel subscription" should find "end your plan")
- **React / Next.js app** — want vector search without a server or API keys?
- **Privacy requirement** — queries must never leave the device?

## Why altor-vec?

| | altor-vec | Algolia | Fuse.js | Orama | Voy |
|---|---|---|---|---|---|
| **Runs client-side** | ✅ | ❌ server | ✅ | ✅ | ✅ |
| **Semantic (meaning-based)** | ✅ HNSW | ✅ paid add-on | ❌ fuzzy text | partial | ❌ |
| **Bundle size** | **54KB** gz | N/A | ~5KB | ~2KB* | 75KB gz |
| **p95 latency** | **0.6ms** | ~50ms (network) | ~2ms | ~5ms | ~2ms |
| **Per-query cost** | **$0** | $0.50/1K | $0 | $0 | $0 |
| **"cancel" → "end subscription"** | ✅ | ✅ | ❌ | partial | ❌ |

<sub>*Orama's 2KB is keyword-only; vector search adds significant size.</sub>

### vs Fuse.js

Fuse.js is great for fuzzy *string* matching. altor-vec does *semantic* matching — meaning, not characters.

| | altor-vec | Fuse.js |
|---|---|---|
| Algorithm | HNSW (vector similarity) | Bitap / Levenshtein |
| "cancel plan" → "end subscription" | ✅ | ❌ |
| Typo tolerance | Via semantic neighbors | ✅ native |
| Bundle size | 54KB WASM | ~5KB |
| Needs embeddings | Yes (build-time) | No |

→ Full comparison: [altorlab.dev/vs/fuse-js](https://altorlab.dev/vs/fuse-js)

## Get started in 30 seconds

```bash
npm install altor-vec
```

```js
import init, { WasmSearchEngine } from 'altor-vec';

await init();

const resp = await fetch('/search-index.bin');
const engine = WasmSearchEngine.from_bytes(new Uint8Array(await resp.arrayBuffer()));

// Search returns in <1ms
const results = JSON.parse(engine.search(queryEmbedding, 5));
// => [[nodeId, distance], ...]
```

→ Full guide: [altorlab.dev/getting-started](https://altorlab.dev/getting-started)

## Framework quickstarts

### React

```jsx
import { useState, useEffect, useRef } from 'react';
import init, { WasmSearchEngine } from 'altor-vec';

export function SearchWidget({ docs }) {
  const engineRef = useRef(null);
  const [results, setResults] = useState([]);

  useEffect(() => {
    init().then(async () => {
      const res = await fetch('/search-index.bin');
      engineRef.current = WasmSearchEngine.from_bytes(
        new Uint8Array(await res.arrayBuffer())
      );
    });
  }, []);

  async function handleSearch(queryEmbedding) {
    const hits = JSON.parse(engineRef.current.search(queryEmbedding, 5));
    setResults(hits.map(([id]) => docs[id]));
  }

  return <input onChange={e => /* embed then handleSearch() */ null} />;
}
```

→ [altorlab.dev/guides/react/document-search](https://altorlab.dev/guides/react/document-search)

### Next.js (App Router)

```jsx
'use client';
import { useRef, useEffect } from 'react';
import init, { WasmSearchEngine } from 'altor-vec';

export default function Search() {
  const engineRef = useRef(null);
  useEffect(() => {
    init().then(async () => {
      const res = await fetch('/search-index.bin');
      engineRef.current = WasmSearchEngine.from_bytes(
        new Uint8Array(await res.arrayBuffer())
      );
    });
  }, []);
  // ...
}
```

→ [altorlab.dev/guides/nextjs/document-search](https://altorlab.dev/guides/nextjs/document-search)

### Vue 3

```vue
<script setup>
import { onMounted } from 'vue';
import init, { WasmSearchEngine } from 'altor-vec';
let engine;
onMounted(async () => {
  await init();
  const res = await fetch('/search-index.bin');
  engine = WasmSearchEngine.from_bytes(new Uint8Array(await res.arrayBuffer()));
});
</script>
```

→ [altorlab.dev/guides/vue/document-search](https://altorlab.dev/guides/vue/document-search)

## Building the index (once, at deploy time)

```js
// scripts/build-search-index.mjs
import { pipeline } from '@huggingface/transformers';
import { WasmSearchEngine } from 'altor-vec/node';
import fs from 'fs';

const embed = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
const docs = [
  { id: 0, text: 'How to cancel your subscription' },
  { id: 1, text: 'Account settings and profile preferences' },
  { id: 2, text: 'Getting started with the API' },
];

const vectors = [];
for (const doc of docs) {
  const out = await embed(doc.text, { pooling: 'mean', normalize: true });
  vectors.push(...Array.from(out.data));
}

const engine = WasmSearchEngine.from_vectors(
  new Float32Array(vectors), 384, 16, 200, 50
);
fs.writeFileSync('./public/search-index.bin', Buffer.from(engine.serialize()));
```

Add to `package.json`:
```json
{ "scripts": { "prebuild": "node scripts/build-search-index.mjs", "build": "vite build" } }
```

## Web Worker (recommended for production)

```js
// search-worker.js
import init, { WasmSearchEngine } from 'altor-vec';
let engine;
self.onmessage = async (e) => {
  if (e.data.type === 'init') {
    await init();
    const resp = await fetch(e.data.indexUrl);
    engine = WasmSearchEngine.from_bytes(new Uint8Array(await resp.arrayBuffer()));
    postMessage({ type: 'ready' });
  }
  if (e.data.type === 'search') {
    const results = JSON.parse(engine.search(new Float32Array(e.data.query), e.data.topK));
    postMessage({ type: 'results', results });
  }
};
```

## Benchmarks

<table>
<tr><td>

**Latency** (10K vectors, 384d)

| Environment | p95 |
|---|---|
| Chrome | **0.60ms** |
| Node.js | **0.50ms** |
| Native Rust | **0.26ms** |

</td><td>

**Size**

| Asset | Size |
|---|---|
| `.wasm` gzipped | **54KB** |
| `.wasm` raw | 117KB |
| Index (10K/384d) | 17MB |

</td></tr>
</table>

→ [altorlab.dev/benchmarks](https://altorlab.dev/benchmarks/)

## API

| Method | Description |
|---|---|
| `WasmSearchEngine.from_bytes(bytes)` | Load serialized index |
| `WasmSearchEngine.from_vectors(flat, dims, m, ef_c, ef_s)` | Build from flat float array |
| `.search(query, topK)` | Returns JSON `[[id, dist], ...]` |
| `.add_vectors(flat, dims)` | Add vectors to existing index |
| `.serialize()` | Serialize to `Uint8Array` |
| `.len()` | Vector count |
| `.free()` | Free WASM memory |

**HNSW params:** `m=16` (connections/node), `ef_construction=200` (build quality), `ef_search=50` (query recall)

→ Full reference: [altorlab.dev/api](https://altorlab.dev/api)

## Embedding models

| Model | Dims | Runs in browser |
|---|---|---|
| all-MiniLM-L6-v2 | 384 | ✅ via [Transformers.js](https://huggingface.co/docs/transformers.js) |
| nomic-embed-text | 768 | ✅ via Transformers.js |
| text-embedding-3-small | 1536 | Build-time only (OpenAI API) |
| embed-english-v3 | 1024 | Build-time only (Cohere API) |

## Common use cases

- **Documentation search** — [altorlab.dev/use-cases/document-search](https://altorlab.dev/use-cases/document-search)
- **Browser RAG** (retrieval without a server) — [altorlab.dev/blog/browser-rag-tutorial](https://altorlab.dev/blog/browser-rag-tutorial)
- **Product search** — [altorlab.dev/use-cases/product-search](https://altorlab.dev/use-cases/product-search)
- **Semantic autocomplete** — [altorlab.dev/use-cases/autocomplete](https://altorlab.dev/use-cases/autocomplete)
- **Offline-first search** — [altorlab.dev/use-cases/offline-search](https://altorlab.dev/use-cases/offline-search)
- **Chat memory** — [altorlab.dev/use-cases/chat-memory](https://altorlab.dev/use-cases/chat-memory)

## Migration guides

- Algolia → [altorlab.dev/migrate-from/algolia](https://altorlab.dev/migrate-from/algolia)
- Pinecone → [altorlab.dev/migrate-from/pinecone](https://altorlab.dev/migrate-from/pinecone)
- Fuse.js → [altorlab.dev/vs/fuse-js](https://altorlab.dev/vs/fuse-js)
- Pagefind → [altorlab.dev/migrate-from/pagefind](https://altorlab.dev/migrate-from/pagefind)
- ChromaDB → [altorlab.dev/migrate-from/chromadb](https://altorlab.dev/migrate-from/chromadb)
- FAISS → [altorlab.dev/migrate-from/faiss](https://altorlab.dev/migrate-from/faiss)
- Meilisearch → [altorlab.dev/migrate-from/meilisearch](https://altorlab.dev/migrate-from/meilisearch)
- Typesense → [altorlab.dev/migrate-from/typesense](https://altorlab.dev/migrate-from/typesense)

## How it works

altor-vec uses **HNSW (Hierarchical Navigable Small World)** — the same algorithm behind Pinecone, Qdrant, and pgvector. Builds a multi-layer graph; upper layers are express lanes for coarse navigation, bottom layer has all vectors for fine-grained search. O(log n) queries. All vectors are L2-normalized at insert so dot product = cosine similarity.

## Architecture

```
src/
├── lib.rs              # Public API
├── distance.rs         # Dot product + normalization (SIMD-vectorized)
└── hnsw/
    ├── mod.rs          # HnswIndex: API + serialization
    ├── graph.rs        # Layered graph structure
    ├── search.rs       # Greedy beam search
    └── construction.rs # Insert + random layer selection
wasm/
└── src/lib.rs          # WasmSearchEngine (wasm-bindgen wrapper)
```

## Full documentation

| | |
|---|---|
| Getting started | [altorlab.dev/getting-started](https://altorlab.dev/getting-started) |
| API reference | [altorlab.dev/api](https://altorlab.dev/api) |
| React guide | [altorlab.dev/guides/react/document-search](https://altorlab.dev/guides/react/document-search) |
| Next.js guide | [altorlab.dev/guides/nextjs/document-search](https://altorlab.dev/guides/nextjs/document-search) |
| Vue guide | [altorlab.dev/guides/vue/document-search](https://altorlab.dev/guides/vue/document-search) |
| Node.js guide | [altorlab.dev/guides/node/document-search](https://altorlab.dev/guides/node/document-search) |
| All comparisons | [altorlab.dev/vs](https://altorlab.dev/vs/) |
| Migration guides | [altorlab.dev/migrate-from](https://altorlab.dev/migrate-from/) |
| Benchmarks | [altorlab.dev/benchmarks](https://altorlab.dev/benchmarks/) |
| Live examples | [altorlab.dev/examples/document-search](https://altorlab.dev/examples/document-search) |

## Build from source

```bash
cargo test
cargo bench
cd wasm && wasm-pack build --target web --release
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for build instructions, code style, and PR process.

## License

[MIT](LICENSE)

---

<p align="center">
  <b>Built by <a href="https://github.com/altor-lab">altor-lab</a></b> ·
  <a href="https://altorlab.dev">altorlab.dev</a> ·
  <a href="https://www.npmjs.com/package/altor-vec">npm</a> ·
  <a href="https://github.com/altor-lab/altor-vec/issues">issues</a> ·
  <a href="mailto:anshul@altorlab.com">anshul@altorlab.com</a>
</p>
