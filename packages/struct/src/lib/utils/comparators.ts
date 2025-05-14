/**
 * Compares two numbers in ascending order.
 *
 * This function compares two numbers and returns a value indicating their relative order.
 * It returns:
 * - `-1` if `a` is less than `b` (i.e., `a` should come before `b` in ascending order).
 * - `1` if `a` is greater than `b` (i.e., `b` should come before `a`).
 * - `0` if `a` and `b` are equal.
 *
 * @param {number} a - The first number to compare.
 * @param {number} b - The second number to compare.
 * @returns {number} A value indicating the relative order of the numbers.
 *
 * @example
 * // Example 1: a < b, should return -1
 * ascend(3, 5); // -1
 *
 * @example
 * // Example 2: a > b, should return 1
 * ascend(7, 2); // 1
 *
 * @example
 * // Example 3: a === b, should return 0
 * ascend(4, 4); // 0
 */
export function ascend(a: number, b: number): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Compares two numbers in descending order.
 *
 * This function is used to compare two numbers and returns a value indicating their relative order.
 * It returns:
 * - `-1` if `a` is greater than `b` (i.e., `a` should come before `b` in descending order).
 * - `1` if `a` is less than `b` (i.e., `b` should come before `a`).
 * - `0` if `a` and `b` are equal.
 *
 * @param {number} a - The first number to compare.
 * @param {number} b - The second number to compare.
 * @returns {number} A value indicating the relative order of the numbers.
 *
 * @example
 * // Example 1: a > b, should return -1
 * descend(5, 3); // -1
 *
 * @example
 * // Example 2: a < b, should return 1
 * descend(2, 4); // 1
 *
 * @example
 * // Example 3: a === b, should return 0
 * descend(3, 3); // 0
 */
export function descend(a: number, b: number): number {
  return a > b ? -1 : a < b ? 1 : 0
}

export type Comparator<T> = (a: T, b: T) => number
