import { customAlphabet } from 'nanoid';

/**
 * A constant object defining various character sets.
 * These sets can be used to customize the characters included in generated strings.
 * - `LOWERCASE`: All lowercase English letters.
 * - `UPPERCASE`: All uppercase English letters.
 * - `NUMBERS`: All digit characters (0-9).
 * - `SYMBOLS`: A collection of common symbol characters.
 */
export const Alphabet = {
  LOWERCASE: 'abcdefghijklmnopqrstuvwxyz',
  UPPERCASE: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  NUMBERS: '0123456789',
  SYMBOLS: '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
} as const;

/**
 * The default character set used for generating random strings if no custom
 * alphabet is specified. It includes lowercase letters, uppercase letters, and numbers.
 * This set is derived from {@link Alphabet.LOWERCASE}, {@link Alphabet.UPPERCASE},
 * and {@link Alphabet.NUMBERS}.
 */
export const DEFAULT_ALPHABET: string = [Alphabet.LOWERCASE, Alphabet.UPPERCASE, Alphabet.NUMBERS].join('');

/**
 * Generates a cryptographically strong random string of a specified length using a
 * customizable character set.
 *
 * This function utilizes `nanoid`'s `customAlphabet` for the generation process.
 *
 * @example
 * ```typescript
 * // Generate a random string of default length (30) using default characters.
 * const id1 = randomString();
 *
 * // Generate a 6-character random string using only numbers.
 * const numericCode = randomString(6, Alphabet.NUMBERS);
 *
 * // Generate a 10-character random string using 'a', 'b', 'c', '1', '2', '3'.
 * const customCharsId = randomString(10, 'abc', '123');
 *
 * // Generate an 8-character random string using only lowercase letters.
 * const lowercaseId = randomString(8, Alphabet.LOWERCASE);
 * ```
 *
 * @param {number=} [length=30] The desired length of the random string.
 *   Must be a positive integer.
 * @param {...string} args Zero or more strings representing character sets.
 *   If provided, these strings are concatenated to form the alphabet for string generation.
 *   If not provided, {@link DEFAULT_ALPHABET} is used.
 * @returns {string} The generated random string.
 * @throws {Error} If the effective character set (derived from `args` or
 *   {@link DEFAULT_ALPHABET}) is empty, or if `length` is not a positive number.
 *   This error originates from the underlying `nanoid` library.
 */
export function randomString(length: number = 30, ...args: string[]): string {
  const charSet = args.length ? args.join('') : DEFAULT_ALPHABET;
  return customAlphabet(charSet, length)();
}
