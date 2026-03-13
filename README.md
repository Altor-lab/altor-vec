<p align="center">
  <h1 align="center">altor-vec</h1>
  <p align="center">
    <b>Client-side vector search. Rust + WASM. 54KB. Sub-millisecond.</b>
  </p>
  <p align="center">
    <a href="https://www.npmjs.com/package/altor-vec"><img src="https://img.shields.io/npm/v/altor-vec?color=blue&label=npm" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/altor-vec"><img src="https://img.shields.io/npm/dm/altor-vec?color=green" alt="npm downloads"></a>
    <a href="https://github.com/altor-lab/altor-vec/actions/workflows/ci.yml"><img src="https://github.com/altor-lab/altor-vec/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
    <a href="https://github.com/altor-lab/altor-vec/stargazers"><img src="https://img.shields.io/github/stars/altor-lab/altor-vec?style=social" alt="GitHub stars"></a>
    <a href="https://github.com/altor-lab/altor-vec/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License"></a>
    <img src="https://img.shields.io/badge/WASM-54KB_gzipped-orange" alt="WASM size">
  </p>
  <p align="center">
    <a href="https://altorlab.dev"><img src="https://img.shields.io/badge/%F0%9F%9A%80_Try_Live_Demo-altorlab.dev-blueviolet?style=for-the-badge" alt="Try Live Demo"></a>
  </p>
</p>

---

**Zero server. Zero API keys. Zero per-query cost. Your users' data never leaves their browser.**

altor-vec is an HNSW vector similarity search engine written in Rust that compiles to 54KB of WebAssembly. Search 10,000 vectors in under 1ms — entirely client-side.

## Why altor-vec?

> You're paying Algolia **$0.50 per 1,000 searches** and sending your users' queries to a third party.
>
> With altor-vec, search runs in the browser. **$0 per query. Forever.**

| | altor-vec | Algolia | Voy | Orama |
|---|-----------|---------|-----|-------|
| **Runs client-side** | Yes | No | Yes | Yes |
| **Binary size** | **54KB** gz | N/A | 75KB gz | ~2KB* |
| **Algorithm** | **HNSW** | BM25 | k-d tree | Brute-force |
| **p95 latency** | **0.6ms** | ~50ms (network) | ~2ms | ~5ms |
| **Per-query cost** | **$0** | $0.50/1K | $0 | Free tier |

<sub>*Orama's 2KB is keyword search only; vector search adds significant size.</sub>

## Get started in 30 seconds

```bash
npm install altor-vec
```

```js
import init, { WasmSearchEngine } from 'altor-vec';

await init();

// Load a pre-built index
const resp = await fetch('/index.bin');
const engine = new WasmSearchEngine(new Uint8Array(await resp.arrayBuffer()));

// Search — returns in <1ms
const results = JSON.parse(engine.search(queryEmbedding, 5));
// => [[nodeId, distance], ...]
```

That's it. No server to deploy. No API key to manage. No billing to worry about.

## Benchmarks

<table>
<tr><td>

**Latency** (10K vectors, 384d)

| Environment | p95 |
|-------------|-----|
| Chrome | **0.60ms** |
| Node.js | **0.50ms** |
| Native Rust | **0.26ms** |

</td><td>

**Size**

| Asset | Size |
|-------|------|
| `.wasm` gzipped | **54KB** |
| `.wasm` raw | 117KB |
| Index (10K/384d) | 17MB |

</td></tr>
</table>

## Use with a Web Worker (recommended for production)

Keep the main thread free — especially important on mobile:

```js
// worker.js
import init, { WasmSearchEngine } from 'altor-vec';

let engine;
self.onmessage = async (e) => {
  if (e.data.type === 'init') {
    await init();
    const resp = await fetch(e.data.indexUrl);
    engine = new WasmSearchEngine(new Uint8Array(await resp.arrayBuffer()));
    postMessage({ type: 'ready', count: engine.len() });
  }
  if (e.data.type === 'search') {
    const results = JSON.parse(engine.search(new Float32Array(e.data.query), e.data.topK));
    postMessage({ type: 'results', results });
  }
};
```

```js
// main.js — UI stays buttery smooth
const worker = new Worker('worker.js', { type: 'module' });
worker.postMessage({ type: 'init', indexUrl: '/index.bin' });
```

## API

| Method | Description |
|--------|-------------|
| `new WasmSearchEngine(bytes)` | Load a serialized index |
| `.from_vectors(flat, dims, m, ef_construction, ef_search)` | Build index from vectors |
| `.search(query, topK)` | Search → JSON `[[id, dist], ...]` |
| `.add_vectors(flat, dims)` | Add vectors to existing index |
| `.to_bytes()` | Serialize index |
| `.len()` | Vector count |
| `.free()` | Free WASM memory |

**Parameters:**

| Param | Default | What it does |
|-------|---------|-------------|
| `m` | 16 | Connections per node. Higher = better recall, more RAM |
| `ef_construction` | 200 | Build-time beam width. Higher = better index, slower build |
| `ef_search` | 50 | Search-time beam width. Higher = better recall, slower search |

## Works with any embedding model

| Model | Dims | Where it runs |
|-------|------|---------------|
| all-MiniLM-L6-v2 | 384 | Browser ([Transformers.js](https://huggingface.co/docs/transformers.js)) |
| text-embedding-3-small | 1536 | OpenAI API |
| embed-english-v3 | 1024 | Cohere API |

**Fully client-side** with Transformers.js — no API calls at all:

```js
import { pipeline } from '@huggingface/transformers';

const embed = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
const output = await embed('your query', { pooling: 'mean', normalize: true });
const results = JSON.parse(engine.search(new Float32Array(output.data), 5));
```

## How it works

altor-vec uses **HNSW (Hierarchical Navigable Small World)** — the same algorithm behind Pinecone, Qdrant, and pgvector. HNSW builds a multi-layer graph where each node is a vector and edges connect nearby neighbors. Upper layers act as express lanes for coarse navigation; the bottom layer contains all vectors for fine-grained search. A query enters at the top and greedily descends to find the nearest neighbors in O(log n) time.

All vectors are L2-normalized at insert time, so dot product distance equals cosine similarity — no extra computation at search time.

## Architecture

```
src/
├── lib.rs              # Public API re-exports
├── distance.rs         # Dot product, normalization (auto-vectorizes with SIMD)
└── hnsw/
    ├── mod.rs           # HnswIndex: API + serialization
    ├── graph.rs         # Layered graph structure
    ├── search.rs        # Greedy beam search
    └── construction.rs  # HNSW insert + random layer selection

wasm/
└── src/lib.rs          # WasmSearchEngine (wasm-bindgen wrapper)
```

## Packages

This repository contains:

- **[altor-vec](.)** - Core WASM vector search engine (Rust)
- **[docusaurus-plugin-altor-vec](packages/docusaurus-plugin-altor-vec)** - Docusaurus plugin for semantic search (TypeScript)

### Docusaurus Plugin

Add client-side semantic search to your Docusaurus site:

```bash
npm install docusaurus-plugin-altor-vec
```

```javascript
// docusaurus.config.js
module.exports = {
  plugins: ['docusaurus-plugin-altor-vec'],
};
```

**Features:**
- 🚀 Zero configuration required
- ⚡ Runs entirely client-side
- 🎯 Semantic search with Transformers.js or OpenAI
- 📦 Automatic index building during build

[Full Documentation →](packages/docusaurus-plugin-altor-vec)

## Build from source

```bash
cargo test                # run tests
cargo bench               # run benchmarks
cd wasm && wasm-pack build --target web --release  # build WASM
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for build instructions, code style, and PR process.

## License

[MIT](LICENSE)

---

<p align="center">
  <b>Built by <a href="https://github.com/altor-lab">altor-lab</a></b>
  <br>
  <sub>
    <a href="https://www.npmjs.com/package/altor-vec">npm</a> ·
    <a href="https://github.com/altor-lab/altor-vec/issues">Issues</a> ·
    <a href="mailto:anshul@altorlab.dev">Contact</a>
  </sub>
</p>

<p align="center">
  <br>
  <b>Need managed semantic search? Embedding pipeline, index building, CDN delivery?</b>
  <br>
  <a href="mailto:anshul@altorlab.dev">anshul@altorlab.dev</a>
</p>
