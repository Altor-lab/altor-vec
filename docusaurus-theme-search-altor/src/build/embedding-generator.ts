import type {DocEntry} from '../options';

const EMBEDDING_DIMS = 384;
const BATCH_SIZE = 32;

interface EmbeddingResponse {
  embeddings: number[][];
  dims: number;
  model: string;
}

export async function generateEmbeddings(
  docs: DocEntry[],
  embeddingApiUrl: string,
  embeddingModel: string,
): Promise<Float32Array> {
  if (docs.length === 0) {
    return new Float32Array();
  }

  const output = new Float32Array(docs.length * EMBEDDING_DIMS);
  const endpoint = `${embeddingApiUrl.replace(/\/$/, '')}/embed`;

  for (let start = 0; start < docs.length; start += BATCH_SIZE) {
    const batch = docs.slice(start, start + BATCH_SIZE);
    const texts = batch.map(doc => `${doc.title} ${doc.content}`.slice(0, 512));
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({texts, model: embeddingModel}),
    });

    if (!response.ok) {
      throw new Error(`Embedding API request failed: ${response.status} ${await response.text()}`);
    }

    const payload = (await response.json()) as EmbeddingResponse;

    if (payload.dims !== EMBEDDING_DIMS) {
      throw new Error(`Expected ${EMBEDDING_DIMS} embedding dims, received ${payload.dims}`);
    }

    if (payload.embeddings.length !== batch.length) {
      throw new Error(`Expected ${batch.length} embeddings, received ${payload.embeddings.length}`);
    }

    payload.embeddings.forEach((embedding, batchIndex) => {
      if (embedding.length !== EMBEDDING_DIMS) {
        throw new Error(`Embedding ${start + batchIndex} has ${embedding.length} dims, expected ${EMBEDDING_DIMS}`);
      }

      const offset = (start + batchIndex) * EMBEDDING_DIMS;
      output.set(embedding, offset);
    });

    const processed = Math.min(start + batch.length, docs.length);
    console.log(`[altor-search] Embedded ${processed}/${docs.length} chunks`);
  }

  return output;
}

export {EMBEDDING_DIMS};
