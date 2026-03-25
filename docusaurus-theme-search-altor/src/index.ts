import path from 'path';
import type {LoadContext, Plugin, PluginContentLoadedActions} from '@docusaurus/types';
import type {AltorSearchOptions} from './options';
import {buildSearchIndex} from './build/index';
import {
  DEFAULT_THEME_CONFIG,
  normalizeThemeConfig,
  validateThemeConfig,
} from './validateThemeConfig';

function addSearchRoute(actions: PluginContentLoadedActions, searchPagePath: string | false): void {
  if (searchPagePath === false) {
    return;
  }

  const normalizedPath = searchPagePath.startsWith('/') ? searchPagePath : `/${searchPagePath}`;
  actions.addRoute({
    path: normalizedPath,
    component: '@theme/SearchPage',
    exact: true,
  });
}

export default function docusaurusThemeSearchAltor(
  context: LoadContext,
  _options: AltorSearchOptions = {},
): Plugin<void> {
  const altorSearchConfig = normalizeThemeConfig(context.siteConfig.themeConfig).altorSearch ?? DEFAULT_THEME_CONFIG;

  return {
    name: 'docusaurus-theme-search-altor',

    getThemePath() {
      return path.join(__dirname, 'theme');
    },

    contentLoaded({actions}) {
      addSearchRoute(actions, altorSearchConfig.searchPagePath);
    },

    async postBuild({outDir}) {
      await buildSearchIndex({
        outDir,
        embeddingApiUrl: altorSearchConfig.embeddingApiUrl,
        embeddingModel: altorSearchConfig.embeddingModel,
        hnsw: altorSearchConfig.hnsw,
      });
    },
  };
}

export {validateThemeConfig};
export type {AltorSearchOptions} from './options';
