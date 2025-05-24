/**
 * Swaps two elements in the given array (heap) at the specified indices.
 *
 * @example
 * const arr = [1, 2, 3, 4];
 * swap(arr, 0, 3);
 * // arr is now [4, 2, 3, 1]
 *
 * @template T The type of elements in the array.
 * @param {T[]} heap The array in which elements will be swapped.
 * @param {number} a The index of the first element to swap.
 * @param {number} b The index of the second element to swap.
 * @returns {void}
 * @throws {RangeError} If either index `a` or `b` is out of the bounds of the `heap` array.
 */
export function swap<T>(heap: T[], a: number, b: number): void {
  if (a < 0 || b < 0 || a >= heap.length || b >= heap.length) {
    throw new RangeError('Index out of bounds')
  }

  ;[heap[a], heap[b]] = [heap[b], heap[a]]
}
