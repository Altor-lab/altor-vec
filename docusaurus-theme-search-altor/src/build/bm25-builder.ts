import type {DocEntry} from '../options';

export interface Bm25Index {
  invertedIndex: Record<string, Array<[number, number]>>;
  docLengths: Record<string, number>;
  avgDocLength: number;
  docCount: number;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(token => token.length >= 2);
}

export function buildBm25Index(docs: DocEntry[]): Bm25Index {
  const invertedIndex = new Map<string, Array<[number, number]>>();
  const docLengths: Record<string, number> = {};
  let totalDocLength = 0;

  for (const doc of docs) {
    const tokens = tokenize(`${doc.title} ${doc.headings.join(' ')} ${doc.content}`);
    docLengths[String(doc.id)] = tokens.length;
    totalDocLength += tokens.length;

    const frequencies = new Map<string, number>();
    for (const token of tokens) {
      frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    }

    for (const [token, frequency] of frequencies) {
      const postings = invertedIndex.get(token) ?? [];
      postings.push([doc.id, frequency]);
      invertedIndex.set(token, postings);
    }
  }

  const serializedInvertedIndex = Object.fromEntries(
    [...invertedIndex.entries()].sort(([left], [right]) => left.localeCompare(right)),
  );
  const avgDocLength = docs.length > 0 ? totalDocLength / docs.length : 0;

  console.log(`[altor-search] BM25 index: ${Object.keys(serializedInvertedIndex).length} tokens, ${docs.length} docs`);

  return {
    invertedIndex: serializedInvertedIndex,
    docLengths,
    avgDocLength,
    docCount: docs.length,
  };
}
