#!/bin/bash
# Build WASM and prepare npm package as "altor-vec"
# Produces both browser (web) and Node.js targets inside pkg/
set -e

cd "$(dirname "$0")"

echo "Building WASM (web target)..."
wasm-pack build --target web --release

echo "Building WASM (Node.js target)..."
wasm-pack build --target nodejs --release --out-dir pkg-node

echo "Copying Node.js artifacts into pkg/node/..."
mkdir -p pkg/node
cp pkg-node/altor_vec_wasm.js pkg/node/
cp pkg-node/altor_vec_wasm.d.ts pkg/node/
cp pkg-node/altor_vec_wasm_bg.wasm pkg/node/
cp pkg-node/altor_vec_wasm_bg.wasm.d.ts pkg/node/
echo '{"type": "commonjs"}' > pkg/node/package.json

echo "Patching package.json..."
node -e "
const pkg = require('./pkg/package.json');
pkg.name = 'altor-vec';
pkg.description = 'Client-side vector search powered by HNSW. 54KB gzipped WASM. Sub-millisecond latency. By altor-lab.';
pkg.keywords = ['vector', 'search', 'hnsw', 'wasm', 'semantic-search', 'embeddings', 'nearest-neighbor', 'client-side', 'altor-lab'];
pkg.homepage = 'https://github.com/altor-lab/altor-vec';
pkg.repository = { type: 'git', url: 'https://github.com/altor-lab/altor-vec' };
pkg.license = 'MIT';
pkg.author = 'altor-lab';
pkg.files = [
  'altor_vec_wasm_bg.wasm',
  'altor_vec_wasm.js',
  'altor_vec_wasm.d.ts',
  'node/altor_vec_wasm.js',
  'node/altor_vec_wasm.d.ts',
  'node/altor_vec_wasm_bg.wasm',
  'node/altor_vec_wasm_bg.wasm.d.ts',
  'node/package.json'
];
pkg.exports = {
  '.': {
    types: './altor_vec_wasm.d.ts',
    import: './altor_vec_wasm.js',
    default: './altor_vec_wasm.js'
  },
  './node': {
    types: './node/altor_vec_wasm.d.ts',
    require: './node/altor_vec_wasm.js',
    default: './node/altor_vec_wasm.js'
  }
};
require('fs').writeFileSync('./pkg/package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Copy README into pkg
cp ../npm-README.md ./pkg/README.md

echo "Done! Package ready in wasm/pkg/"
echo "  npm publish ./wasm/pkg"
echo ""
echo "Exports:"
echo "  import { WasmSearchEngine } from 'altor-vec'       // Browser (ESM)"
echo "  const { WasmSearchEngine } = require('altor-vec/node')  // Node.js (CJS)"
