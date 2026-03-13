/**
 * Copyright (c) altor-lab
 * SPDX-License-Identifier: MIT
 */

import { Logger } from '../types';

/**
 * Log levels with numeric values for comparison.
 */
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

/**
 * Create a default console logger with configurable log level.
 */
export function createDefaultLogger(level: LogLevel = 'info'): Logger {
  const currentLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info;

  return {
    debug(message: string, meta?: any): void {
      if (currentLevel <= LOG_LEVELS.debug) {
        console.debug(`[altor-vec] ${message}`, meta !== undefined ? meta : '');
      }
    },

    info(message: string, meta?: any): void {
      if (currentLevel <= LOG_LEVELS.info) {
        console.info(`[altor-vec] ${message}`, meta !== undefined ? meta : '');
      }
    },

    warn(message: string, meta?: any): void {
      if (currentLevel <= LOG_LEVELS.warn) {
        console.warn(`[altor-vec] ${message}`, meta !== undefined ? meta : '');
      }
    },

    error(message: string, error?: Error, meta?: any): void {
      if (currentLevel <= LOG_LEVELS.error) {
        const errorInfo = error ? `\n${error.message}\n${error.stack}` : '';
        console.error(
          `[altor-vec] ${message}${errorInfo}`,
          meta !== undefined ? meta : ''
        );
      }
    },
  };
}

/**
 * Create a silent logger that doesn't output anything.
 * Useful for testing.
 */
export function createSilentLogger(): Logger {
  return {
    debug(): void {},
    info(): void {},
    warn(): void {},
    error(): void {},
  };
}
