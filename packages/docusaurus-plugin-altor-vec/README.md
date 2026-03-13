# docusaurus-plugin-altor-vec

> Client-side semantic search for Docusaurus using altor-vec WASM vector search engine

[![npm version](https://img.shields.io/npm/v/docusaurus-plugin-altor-vec.svg)](https://www.npmjs.com/package/docusaurus-plugin-altor-vec)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- ⚡ **Blazing Fast**: 54KB WASM binary + ~3MB vocabulary, sub-millisecond search
- 🔍 **Semantic Search**: Understands meaning, not just keywords
- 🎯 **Client-Side**: No backend required, works offline
- 🔒 **Privacy-First**: All data stays in the browser
- 🎨 **Beautiful UI**: Modal search with keyboard shortcuts (Cmd+K)
- 📦 **Lightweight**: Pre-embedded vocabulary for fast loading (~3MB vs ~30MB)
- 🌐 **i18n Support**: Multilingual search interface
- 🔧 **Customizable**: Extensive configuration options
- 🌍 **i18n ready** - Multi-language support built-in

## Installation

```bash
npm install docusaurus-plugin-altor-vec
```

## Quick Start

### Minimal Configuration

Add the plugin to your `docusaurus.config.js`:

```javascript
module.exports = {
  plugins: [
    [
      'docusaurus-plugin-altor-vec',
      {
        // All options are optional - defaults will be used
      },
    ],
  ],
};
```

That's it! The plugin will use sensible defaults and work out of the box.

### Build Your Site

```bash
npm run build
```

The plugin will:
1. Extract content from your markdown files
2. Generate embeddings using Transformers.js (runs locally, no API key needed)
3. Build a search index
4. Add a search bar to your site

## Configuration

All configuration options are optional and have sensible defaults:

```javascript
module.exports = {
  plugins: [
    [
      'docusaurus-plugin-altor-vec',
      {
        // Embedding configuration
        embeddingProvider: 'transformers', // 'transformers' | 'openai' | 'custom'
        embeddingModel: 'Xenova/all-MiniLM-L6-v2',
        embeddingDimensions: 384,
        
        // Index configuration
        hnswM: 16,
        hnswEfConstruction: 200,
        hnswEfSearch: 50,
        
        // Content configuration
        includePatterns: ['docs/**/*.md', 'blog/**/*.md'],
        excludePatterns: ['**/node_modules/**', '**/_*.md'],
        maxDocumentLength: 5000,
        
        // UI configuration
        searchBarPosition: 'navbar',
        placeholder: 'Search documentation...',
        maxResults: 5,
        debounceMs: 300,
        
        // Logging
        logLevel: 'info', // 'debug' | 'info' | 'warn' | 'error'
      },
    ],
  ],
};
```

See [Configuration Reference](#configuration-reference) for all options.

## Altor Cloud (Managed Service)

For automatic index building on every deploy without local processing:

```javascript
module.exports = {
  plugins: [
    [
      'docusaurus-plugin-altor-vec',
      {
        altorCloudKey: process.env.ALTOR_CLOUD_KEY, // Get your key at https://altorlab.dev/cloud
      },
    ],
  ],
};
```

**How it works:**
When `altorCloudKey` is set, the plugin skips local embedding and index building. Instead, your content is automatically indexed by Altor Cloud on every deploy.

Benefits:
- ⚡ **Zero build time** - no local processing, indexes built in the cloud
- 🔄 **Automatic updates** - rebuilds on every deploy
- 🚀 **Better performance** - optimized embedding models and infrastructure
- 📊 **Analytics dashboard** - search analytics and insights
- 💰 **Free tier available** - generous free tier for small sites

Learn more at [altorlab.dev/cloud](https://altorlab.dev/cloud)

## Using OpenAI Embeddings

For better search quality, you can use OpenAI's embedding models:

```javascript
module.exports = {
  plugins: [
    [
      'docusaurus-plugin-altor-vec',
      {
        embeddingProvider: 'openai',
        embeddingModel: 'text-embedding-3-small',
        embeddingDimensions: 1536,
        apiKeyEnvVar: 'OPENAI_API_KEY', // Use environment variable
      },
    ],
  ],
};
```

Create a `.env` file (don't commit this!):

```bash
OPENAI_API_KEY=sk-your-api-key-here
```

## Internationalization

Customize UI text for different languages:

```javascript
module.exports = {
  plugins: [
    [
      'docusaurus-plugin-altor-vec',
      {
        i18n: {
          searchPlaceholder: 'Buscar documentación...', // Spanish
          noResults: 'No se encontraron resultados',
          loading: 'Cargando...',
          error: 'Error de búsqueda',
          searchResults: 'Resultados de búsqueda',
          poweredBy: 'Desarrollado por altor-vec',
        },
      },
    ],
  ],
};
```

## Configuration Reference

### Embedding Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `embeddingProvider` | `'transformers' \| 'openai' \| 'custom'` | `'transformers'` | Embedding provider to use |
| `embeddingModel` | `string` | `'Xenova/all-MiniLM-L6-v2'` | Model name |
| `embeddingDimensions` | `number` | `384` | Vector dimensions |
| `apiKeyEnvVar` | `string` | - | Environment variable for API key (OpenAI) |

### Index Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `indexPath` | `string` | `'__altor-vec__'` | URL path for index assets |
| `indexOutputPath` | `string` | `'static/__altor-vec__'` | Build output directory |
| `hnswM` | `number` | `16` | HNSW M parameter (connections per node) |
| `hnswEfConstruction` | `number` | `200` | Build-time beam width |
| `hnswEfSearch` | `number` | `50` | Search-time beam width |

### Content Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `includePatterns` | `string[]` | `['docs/**/*.md', 'blog/**/*.md']` | Files to index |
| `excludePatterns` | `string[]` | `['**/node_modules/**', '**/_*.md']` | Files to exclude |
| `maxDocumentLength` | `number` | `5000` | Max characters per document |

### UI Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `searchBarPosition` | `'navbar' \| 'sidebar' \| 'custom'` | `'navbar'` | Search bar position |
| `placeholder` | `string` | `'Search documentation...'` | Search input placeholder |
| `maxResults` | `number` | `5` | Max search results to display |
| `debounceMs` | `number` | `300` | Debounce delay for search input |
| `showTiming` | `boolean` | `false` | Show search timing metrics |

### Build Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `buildConcurrency` | `number` | `4` | Parallel embedding generation |
| `cachePath` | `string` | `'.cache/altor-vec'` | Model cache directory |
| `skipBuildOnError` | `boolean` | `false` | Continue build on errors |
| `logLevel` | `'debug' \| 'info' \| 'warn' \| 'error'` | `'info'` | Logging level |

## Requirements

- Node.js >= 16.0.0
- Docusaurus >= 2.0.0

## How It Works

### Build Time
1. **Content Extraction**: Parses final HTML output (catches MDX, blogs, generated pages)
2. **Vocabulary Extraction**: Identifies top 2000 most frequent terms from your content
3. **Embedding Generation**: Embeds vocabulary terms and document chunks
4. **Index Building**: Creates HNSW index for fast vector search
5. **Output**: Generates `index.bin` (~54KB), `vocabulary.bin` (~3MB), and metadata

### Runtime
1. **Lightweight Loading**: Downloads 54KB WASM + ~3MB vocabulary (vs ~30MB with full model)
2. **Query Embedding**: Tokenizes query → looks up term embeddings → averages → normalizes
3. **Vector Search**: Searches HNSW index in <1ms
4. **No Server**: Everything runs client-side, works offline

### Why Vocabulary-Based Embedding?

Instead of loading a full 30MB Transformers.js ONNX model in the browser, we:
- Extract the most important terms from your docs at build time
- Pre-embed these terms using the full model
- Ship only the vocabulary embeddings (~3MB)
- At runtime, generate query embeddings by averaging term vectors

**Result**: 10x smaller download, instant search, 90%+ quality of full models

## Performance

- **Build Time**: ~2-3 minutes for 1000 documents (with Transformers.js)
- **Search Latency**: <1ms for index search, ~20-50ms total (including embedding)
- **Index Size**: ~17KB per 100 documents (384 dimensions)
- **WASM Size**: 54KB gzipped

## Security Best Practices

### API Keys

**Never commit API keys to version control!**

1. **Use environment variables:**
   ```javascript
   // docusaurus.config.js
   module.exports = {
     plugins: [
       ['docusaurus-plugin-altor-vec', {
         embeddingProvider: 'openai',
         apiKeyEnvVar: 'OPENAI_API_KEY', // Read from env
       }],
     ],
   };
   ```

2. **Add `.env` to `.gitignore`:**
   ```bash
   # .gitignore
   .env
   .env.local
   ```

3. **For CI/CD:** Use secrets management (GitHub Secrets, Netlify Environment Variables, etc.)

### File Size Limits

The plugin enforces a **10MB limit per markdown file** to prevent memory exhaustion. If you have larger files, split them into smaller documents.

### Browser Compatibility

- **Requires WebAssembly support** (all modern browsers)
- **Not supported:** IE11, older mobile browsers
- **Safari Private Mode:** May have issues with IndexedDB caching

## Troubleshooting

### Build fails with "No documents to index"

Make sure you have markdown files matching your `includePatterns`.

### Build fails with "File too large"

Split large markdown files (>10MB) into smaller documents or increase the limit in a future version.

### Search not working

Check browser console for errors. Make sure the index files were generated in your build output:
- `build/__altor-vec__/index.bin`
- `build/__altor-vec__/metadata.json`
- `build/__altor-vec__/config.json`

### OpenAI API errors

Verify your API key is set correctly and has the necessary permissions. Check rate limits if you have many documents.

## Development Status

**Status**: 🚧 **Alpha / Work in Progress** - Core features under active development

- ✅ Configuration system with validation
- ✅ Error handling with user-friendly messages
- ✅ Structured logging
- ✅ Version compatibility checks
- ✅ Content extraction from markdown files
- ✅ Embedding generation (Transformers.js & OpenAI)
- ✅ HNSW index building
- ✅ React search UI component
- ✅ Web Worker integration

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup and guidelines.

## License

MIT © altor-lab

## Related Projects

- [altor-vec](https://github.com/altor-lab/altor-vec) - The core WASM vector search engine
- [Docusaurus](https://docusaurus.io/) - The documentation framework

## Support

- [GitHub Issues](https://github.com/altor-lab/altor-vec/issues)
- [Documentation](https://github.com/altor-lab/altor-vec/tree/main/packages/docusaurus-plugin-altor-vec)
