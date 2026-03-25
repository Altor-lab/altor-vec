import type {DocEntry} from '../options';
import {extractContent} from './content-extractor';
import {buildBm25Index} from './bm25-builder';
import {generateEmbeddings, EMBEDDING_DIMS} from './embedding-generator';
import {buildHnswIndex} from './hnsw-builder';

const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');

type SearchMetadataEntry = Pick<DocEntry, 'id' | 'title' | 'url' | 'headings' | 'snippet' | 'type'>;

export async function buildSearchIndex(opts: {
  outDir: string;
  embeddingApiUrl: string;
  embeddingModel: string;
  hnsw: {m: number; efConstruction: number; efSearch: number};
}): Promise<void> {
  const docs = await extractContent(opts.outDir);
  const bm25 = buildBm25Index(docs);
  const metadata: SearchMetadataEntry[] = docs.map(doc => ({
    id: doc.id,
    title: doc.title,
    url: doc.url,
    headings: doc.headings,
    snippet: doc.snippet,
    type: doc.type,
  }));

  const searchDir = path.join(opts.outDir, 'search');
  await fs.promises.mkdir(searchDir, {recursive: true});

  if (docs.length === 0) {
    await fs.promises.writeFile(path.join(searchDir, 'index.bin'), Buffer.alloc(0));
    await fs.promises.writeFile(path.join(searchDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    await fs.promises.writeFile(path.join(searchDir, 'bm25.json'), JSON.stringify(bm25, null, 2));
    return;
  }

  const embeddings = await generateEmbeddings(docs, opts.embeddingApiUrl, opts.embeddingModel);
  const hnswBytes = buildHnswIndex(embeddings, EMBEDDING_DIMS, opts.hnsw);

  await fs.promises.writeFile(path.join(searchDir, 'index.bin'), Buffer.from(hnswBytes));
  await fs.promises.writeFile(path.join(searchDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  await fs.promises.writeFile(path.join(searchDir, 'bm25.json'), JSON.stringify(bm25, null, 2));
}
