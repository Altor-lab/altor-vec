#!/usr/bin/env node

import path from 'path';
import {buildSearchIndex} from '../src/build/index';
import {DEFAULT_THEME_CONFIG} from '../src/validateThemeConfig';

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

async function main(): Promise<void> {
  const outDirArgument = readArg('--outDir');

  if (!outDirArgument) {
    throw new Error('Missing required --outDir argument');
  }

  await buildSearchIndex({
    outDir: path.resolve(process.cwd(), outDirArgument),
    embeddingApiUrl: DEFAULT_THEME_CONFIG.embeddingApiUrl,
    embeddingModel: DEFAULT_THEME_CONFIG.embeddingModel,
    hnsw: DEFAULT_THEME_CONFIG.hnsw,
  });
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[altor-search] Build failed:', message);
    process.exit(1);
  });
