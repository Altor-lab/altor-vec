/**
 * Copyright (c) altor-lab
 * SPDX-License-Identifier: MIT
 */

import * as semver from 'semver';
import { PluginError } from './PluginError';
import { ErrorCode } from '../types';

/**
 * Check compatibility with Docusaurus version.
 * Requires Docusaurus >= 2.0.0
 */
export function checkDocusaurusCompatibility(): void {
  try {
    // Try to load Docusaurus version
    const docusaurusPackage = require('@docusaurus/core/package.json');
    const version = docusaurusPackage.version;

    if (!semver.satisfies(version, '>=2.0.0')) {
      throw new PluginError(
        `Incompatible Docusaurus version: ${version}`,
        ErrorCode.VERSION_INCOMPATIBLE,
        'Upgrade Docusaurus to version 2.0.0 or higher'
      );
    }
  } catch (error) {
    // If it's our PluginError, re-throw it
    if (error instanceof PluginError) {
      throw error;
    }

    // If we can't check version, warn but continue
    console.warn(
      '[altor-vec] Could not verify Docusaurus version compatibility:',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Check Node.js version compatibility.
 * Requires Node.js >= 16.0.0
 */
export function checkNodeCompatibility(): void {
  const nodeVersion = process.version;

  if (!semver.satisfies(nodeVersion, '>=16.0.0')) {
    throw new PluginError(
      `Incompatible Node.js version: ${nodeVersion}`,
      ErrorCode.VERSION_INCOMPATIBLE,
      'Upgrade Node.js to version 16.0.0 or higher'
    );
  }
}

/**
 * Check all compatibility requirements.
 */
export function checkCompatibility(): void {
  checkNodeCompatibility();
  checkDocusaurusCompatibility();
}
