import chalk from 'chalk';
import { parse } from 'jsonc-parser';

import type { ParseError, ParseOptions } from 'jsonc-parser';

export { chalk };

/**
 * Parses a JSONC (JSON with Comments) string and deserializes it into a
 * JavaScript object. This function is a wrapper around the `jsonc-parser`
 * library's `parse` method.
 *
 * @template T The expected type of the parsed JSON object.
 * @param {string} text The JSONC string to parse.
 * @param {ParseError[]=} errors An optional array that will be populated with any
 *   parsing errors that occur.
 * @param {ParseOptions=} options Optional configuration for the parsing process.
 * @returns {T} The deserialized JavaScript object or value.
 */
export function parseJsonc<T>(text: string, errors?: ParseError[], options?: ParseOptions): T {
  return parse(text, errors, options);
}
