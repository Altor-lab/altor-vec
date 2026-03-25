import cors from 'cors';
import express from 'express';
import { pipeline } from '@xenova/transformers';

const PORT = process.env.PORT || 3001;
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const MODEL_NAME = 'all-MiniLM-L6-v2';
const DIMS = 384;

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${elapsedMs.toFixed(1)}ms`);
  });
  next();
});

let embedder;
let modelReady = false;
let modelLoadError = null;

function assertText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function reshapeEmbeddings(output) {
  const values = Array.from(output.data);
  if (!Array.isArray(output.dims) || output.dims.length === 1) {
    return [values];
  }

  const batchSize = output.dims[0];
  const dims = output.dims[output.dims.length - 1];
  const embeddings = [];

  for (let index = 0; index < batchSize; index += 1) {
    const start = index * dims;
    embeddings.push(values.slice(start, start + dims));
  }

  return embeddings;
}

async function createEmbeddings(texts) {
  if (!embedder) {
    throw new Error('Model is not ready yet');
  }

  const output = await embedder(texts, {
    pooling: 'mean',
    normalize: true,
  });

  return reshapeEmbeddings(output);
}

app.get('/health', (_req, res) => {
  if (modelLoadError) {
    return res.status(500).json({
      status: 'error',
      model: MODEL_NAME,
      dims: DIMS,
      error: modelLoadError.message,
    });
  }

  if (!modelReady) {
    return res.status(503).json({
      status: 'loading',
      model: MODEL_NAME,
      dims: DIMS,
    });
  }

  return res.json({ status: 'ok', model: MODEL_NAME, dims: DIMS });
});

app.post('/embed', async (req, res) => {
  try {
    if (modelLoadError) {
      return res.status(500).json({ error: 'Model failed to load', details: modelLoadError.message });
    }

    if (!modelReady) {
      return res.status(503).json({ error: 'Model is still loading' });
    }

    const { text, texts } = req.body ?? {};

    if (text !== undefined && texts !== undefined) {
      return res.status(400).json({ error: 'Provide either text or texts, not both' });
    }

    if (text !== undefined) {
      if (!assertText(text)) {
        return res.status(400).json({ error: 'text must be a non-empty string' });
      }

      const [embedding] = await createEmbeddings(text.trim());
      return res.json({ embedding, dims: embedding.length, model: MODEL_NAME });
    }

    if (texts !== undefined) {
      if (!Array.isArray(texts) || texts.length === 0 || !texts.every(assertText)) {
        return res.status(400).json({ error: 'texts must be a non-empty array of non-empty strings' });
      }

      const embeddings = await createEmbeddings(texts.map(item => item.trim()));
      return res.json({ embeddings, dims: embeddings[0]?.length ?? DIMS, model: MODEL_NAME });
    }

    return res.status(400).json({ error: 'Request body must include text or texts' });
  } catch (error) {
    console.error('Embedding request failed:', error);
    return res.status(500).json({ error: 'Embedding failed', details: error.message });
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  console.error('Unhandled server error:', err);
  return res.status(500).json({ error: 'Internal server error' });
});

async function loadModel() {
  try {
    console.log(`Loading model ${MODEL_ID}...`);
    embedder = await pipeline('feature-extraction', MODEL_ID, {
      progress_callback: progress => {
        const parts = [progress.status];
        if (progress.file) parts.push(progress.file);
        if (typeof progress.progress === 'number') parts.push(`${progress.progress.toFixed(1)}%`);
        if (typeof progress.loaded === 'number' && typeof progress.total === 'number') {
          parts.push(`${progress.loaded}/${progress.total}`);
        }
        console.log('[model]', parts.filter(Boolean).join(' '));
      },
    });
    modelReady = true;
    console.log(`Model loaded: ${MODEL_NAME} (${DIMS} dims)`);
  } catch (error) {
    modelLoadError = error;
    console.error('Model load failed:', error);
  }
}

app.listen(PORT, () => {
  console.log(`Embedding API listening on http://localhost:${PORT}`);
});

loadModel();
