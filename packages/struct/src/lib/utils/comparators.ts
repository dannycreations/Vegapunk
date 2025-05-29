/**
 * Compares two numbers for ascending order.
 * This function is suitable for use as a callback for array sorting methods,
 * such as `Array.prototype.sort()`, to sort numbers in ascending sequence.
 * It returns -1 if `a` is less than `b`, 1 if `a` is greater than `b`, and 0 if they are equal.
 *
 * @example
 * const numbers = [3, 1, 4, 1, 5, 9];
 * numbers.sort(ascend); // numbers will be [1, 1, 3, 4, 5, 9]
 *
 * console.log(ascend(2, 5)); // -1
 * console.log(ascend(5, 2)); // 1
 * console.log(ascend(5, 5)); // 0
 *
 * @param {number} a The first number to compare.
 * @param {number} b The second number to compare.
 * @returns {number} A negative value if `a` is less than `b`, a positive value if `a` is greater than `b`, or 0 if they are equal.
 */
export function ascend(a: number, b: number): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Compares two numbers for descending order.
 * This function is suitable for use as a callback for array sorting methods,
 * such as `Array.prototype.sort()`, to sort numbers in descending sequence.
 * It returns -1 if `a` is greater than `b`, 1 if `a` is less than `b`, and 0 if they are equal.
 *
 * @example
 * const numbers = [3, 1, 4, 1, 5, 9];
 * numbers.sort(descend); // numbers will be [9, 5, 4, 3, 1, 1]
 *
 * console.log(descend(2, 5)); // 1
 * console.log(descend(5, 2)); // -1
 * console.log(descend(5, 5)); // 0
 *
 * @param {number} a The first number to compare.
 * @param {number} b The second number to compare.
 * @returns {number} A negative value if `a` is greater than `b`, a positive value if `a` is less than `b`, or 0 if they are equal.
 */
export function descend(a: number, b: number): number {
  return a > b ? -1 : a < b ? 1 : 0
}

/**
 * Defines the signature for a comparison function that takes two arguments of the same type `T`
 * and returns a number indicating their relative order.
 * This type is commonly used for sorting functions like {@link ascend} or {@link descend}.
 * The comparator should return:
 * - A negative number if the first argument is less than the second.
 * - A positive number if the first argument is greater than the second.
 * - Zero if the arguments are considered equal in terms of sorting.
 *
 * @template T The type of the items to be compared by the function.
 */
export type Comparator<T> = (a: T, b: T) => number
