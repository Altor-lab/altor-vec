import Joi from 'joi';
import type {ThemeConfigValidationContext} from '@docusaurus/types';
import type {AltorSearchConfig} from './options';

export interface AltorThemeConfig extends Record<string, unknown> {
  altorSearch?: AltorSearchConfig;
}

export const DEFAULT_THEME_CONFIG: AltorSearchConfig = {
  searchPagePath: 'search',
  embeddingModel: 'all-MiniLM-L6-v2',
  embeddingApiUrl: 'https://cursor-worker.fly.dev',
  maxResultsPerQuery: 8,
  hnsw: {m: 16, efConstruction: 200, efSearch: 50},
  placeholder: 'Search docs...',
  keyboardShortcut: true,
};

const altorSearchSchema = Joi.object<AltorSearchConfig>({
  searchPagePath: Joi.alternatives()
    .try(Joi.boolean().invalid(true), Joi.string())
    .default(DEFAULT_THEME_CONFIG.searchPagePath),
  embeddingModel: Joi.string().default(DEFAULT_THEME_CONFIG.embeddingModel),
  embeddingApiUrl: Joi.string().uri({scheme: ['http', 'https']}).default(DEFAULT_THEME_CONFIG.embeddingApiUrl),
  maxResultsPerQuery: Joi.number().integer().min(1).default(DEFAULT_THEME_CONFIG.maxResultsPerQuery),
  hnsw: Joi.object<AltorSearchConfig['hnsw']>({
    m: Joi.number().integer().min(2).default(DEFAULT_THEME_CONFIG.hnsw.m),
    efConstruction: Joi.number().integer().min(1).default(DEFAULT_THEME_CONFIG.hnsw.efConstruction),
    efSearch: Joi.number().integer().min(1).default(DEFAULT_THEME_CONFIG.hnsw.efSearch),
  }).default(DEFAULT_THEME_CONFIG.hnsw),
  placeholder: Joi.string().default(DEFAULT_THEME_CONFIG.placeholder),
  keyboardShortcut: Joi.boolean().default(DEFAULT_THEME_CONFIG.keyboardShortcut),
});

const themeConfigSchema = Joi.object<AltorThemeConfig>({
  altorSearch: altorSearchSchema.default(DEFAULT_THEME_CONFIG),
}).unknown(true);

export function normalizeThemeConfig(themeConfig: Record<string, unknown>): AltorThemeConfig {
  const {error, value} = themeConfigSchema.validate(themeConfig, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    throw error;
  }

  return value;
}

export function validateThemeConfig({
  themeConfig,
}: ThemeConfigValidationContext<AltorThemeConfig>): AltorThemeConfig {
  return normalizeThemeConfig(themeConfig);
}
