interface WasmSearchEngineInstance {
  len(): number;
  to_bytes(): Uint8Array;
}

interface WasmSearchEngineModule {
  WasmSearchEngine: {
    from_vectors(
      flat: Float32Array,
      dims: number,
      m: number,
      efConstruction: number,
      efSearch: number,
    ): WasmSearchEngineInstance;
  };
}

export function buildHnswIndex(
  embeddings: Float32Array,
  dims: number,
  hnsw: {m: number; efConstruction: number; efSearch: number},
): Uint8Array {
  const wasmModule: WasmSearchEngineModule = require('/home/ubuntu/altor-vec/wasm/pkg/node/altor_vec_wasm.js');
  const vectorCount = embeddings.length / dims;
  const engine = wasmModule.WasmSearchEngine.from_vectors(
    embeddings,
    dims,
    hnsw.m,
    hnsw.efConstruction,
    hnsw.efSearch,
  );
  const bytes = engine.to_bytes();

  console.log(`[altor-search] Built HNSW index: ${vectorCount} vectors, ${bytes.length} bytes`);
  return bytes;
}
