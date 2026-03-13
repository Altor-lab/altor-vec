/**
 * Copyright (c) altor-lab
 * SPDX-License-Identifier: MIT
 */

import { ErrorCode } from '../types';

/**
 * Custom error class for plugin errors with error codes and suggestions.
 */
export class PluginError extends Error {
  public readonly code: ErrorCode;
  public readonly suggestion?: string;

  constructor(message: string, code: ErrorCode, suggestion?: string) {
    super(message);
    this.name = 'AltorVecPluginError';
    this.code = code;
    this.suggestion = suggestion;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, PluginError);
    }
  }

  /**
   * Get a formatted error message with code and suggestion.
   */
  getFormattedMessage(): string {
    let message = `[altor-vec] ${this.message}\nCode: ${this.code}`;
    if (this.suggestion) {
      message += `\nSuggestion: ${this.suggestion}`;
    }
    return message;
  }

  /**
   * Convert error to JSON for serialization.
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      suggestion: this.suggestion,
      stack: this.stack,
    };
  }
}
