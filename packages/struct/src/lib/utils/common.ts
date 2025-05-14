/**
 * Swaps two elements in an array at the specified indices.
 *
 * This function modifies the array in place, exchanging the elements
 * located at the indices `a` and `b`. It is particularly useful in
 * algorithms like sorting or heap operations.
 *
 * @template T The type of the elements in the array.
 * @param {T[]} heap - The array in which the elements will be swapped.
 * @param {number} a - The index of the first element to swap.
 * @param {number} b - The index of the second element to swap.
 * @returns {void}
 *
 * @throws {RangeError} If either index `a` or `b` is out of bounds.
 *
 * @example
 * // Example: Swapping elements in an array
 * const arr = [1, 2, 3, 4];
 * swap(arr, 1, 3);
 * console.log(arr); // Output: [1, 4, 3, 2]
 */
export function swap<T>(heap: T[], a: number, b: number): void {
  if (a < 0 || b < 0 || a >= heap.length || b >= heap.length) {
    throw new RangeError('Index out of bounds')
  }

  ;[heap[a], heap[b]] = [heap[b], heap[a]]
}
