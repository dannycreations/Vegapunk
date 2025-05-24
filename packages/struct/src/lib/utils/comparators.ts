/**
 * Compares two numbers for ascending order.
 * Useful as a comparator function for sorting arrays in ascending order.
 *
 * @example
 * const numbers = [3, 1, 4, 1, 5, 9, 2, 6];
 * numbers.sort(ascend);
 * // numbers is now [1, 1, 2, 3, 4, 5, 6, 9]
 *
 * @param {number} a The first number to compare.
 * @param {number} b The second number to compare.
 * @returns {number} Returns -1 if `a` is less than `b`, 1 if `a` is greater than `b`, and 0 if they are equal.
 */
export function ascend(a: number, b: number): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Compares two numbers for descending order.
 * Useful as a comparator function for sorting arrays in descending order.
 *
 * @example
 * const numbers = [3, 1, 4, 1, 5, 9, 2, 6];
 * numbers.sort(descend);
 * // numbers is now [9, 6, 5, 4, 3, 2, 1, 1]
 *
 * @param {number} a The first number to compare.
 * @param {number} b The second number to compare.
 * @returns {number} Returns -1 if `a` is greater than `b`, 1 if `a` is less than `b`, and 0 if they are equal.
 */
export function descend(a: number, b: number): number {
  return a > b ? -1 : a < b ? 1 : 0
}

export type Comparator<T> = (a: T, b: T) => number
