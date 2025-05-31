/**
 * Swaps two elements at the specified indices within an array.
 * This operation is performed in-place.
 *
 * @example
 * const numbers = [10, 20, 30, 40];
 * swap(numbers, 0, 3);
 * console.log(numbers); // Output: [40, 20, 30, 10]
 *
 * try {
 *   swap(numbers, 1, 5); // Attempting to swap with an out-of-bounds index
 * } catch (e) {
 *   if (e instanceof RangeError) {
 *     console.error(e.message); // Output: Index out of bounds
 *   }
 * }
 *
 * @template T The type of elements in the array.
 * @param {T[]} heap The array, often representing a heap, in which elements will be swapped.
 * @param {number} a The index of the first element to swap.
 * @param {number} b The index of the second element to swap.
 * @returns {void}
 * @throws {RangeError} If either index `a` or `b` is less than 0, or greater than or
 *   equal to the length of the `heap` array.
 */
export function swap<T>(heap: T[], a: number, b: number): void {
  if (a < 0 || b < 0 || a >= heap.length || b >= heap.length) {
    throw new RangeError('Index out of bounds')
  }

  ;[heap[a], heap[b]] = [heap[b], heap[a]]
}
