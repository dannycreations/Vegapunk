import { swap } from '@vegapunk/utilities';
import { isObjectLike, merge } from '@vegapunk/utilities/common';

import type { Comparator } from '@vegapunk/utilities';

/**
 * Implements a priority queue using a binary heap data structure.
 * The priority of elements is determined by a custom comparator function.
 *
 * @template T The type of elements held in the queue.
 */
export class Queue<T> {
  protected readonly heap: T[] = [];
  protected readonly compare: Comparator<T>;
  protected lastHeap: T | undefined;

  /**
   * Initializes a new instance of the Queue.
   *
   * @param {(a: T, b: T) => number=} [compare=() => 0] A function that defines the sort
   *   order. If omitted, the queue will not maintain any specific priority order.
   *   The function should return a negative value if `a` has higher priority than `b`,
   *   a positive value if `b` has higher priority, and zero if they have equal priority.
   */
  public constructor(compare: Comparator<T> = () => 0) {
    this.compare = compare;
  }

  /**
   * Gets the number of elements contained in the queue.
   *
   * @returns {number} The total number of elements in the queue.
   */
  public get size(): number {
    return this.heap.length;
  }

  /**
   * Gets the last element that was removed from the queue via {@link dequeue}.
   *
   * @returns {T | undefined} The last dequeued element, or `undefined` if no
   *   element has been dequeued yet.
   */
  public get last(): T | undefined {
    return this.lastHeap;
  }

  /**
   * Returns the element at the specified index without removing it from the queue.
   * In a priority queue, the element at index 0 is the one with the highest priority.
   *
   * @example
   * ```typescript
   * const queue = new Queue<number>((a, b) => a - b);
   * queue.enqueue(10, 5, 20);
   * const highestPriority = queue.peek(); // 5
   * const thirdElementInHeap = queue.peek(2); // 20
   * ```
   *
   * @param {number=} [index=0] The zero-based index of the element to retrieve.
   * @returns {T | undefined} The element at the specified index, or `undefined` if the
   *   index is out of bounds.
   */
  public peek(index: number = 0): T | undefined {
    return this.heap[index];
  }

  /**
   * Adds one or more elements to the queue and maintains the heap property.
   *
   * @example
   * ```typescript
   * const queue = new Queue<number>((a, b) => a - b); // Min-heap
   * queue.enqueue(10);
   * queue.enqueue(5, 20);
   * console.log(queue.size); // 3
   * ```
   *
   * @param {...T} values The elements to add to the queue.
   * @returns {void}
   */
  public enqueue(...values: T[]): void {
    for (const value of values) {
      this.heap.push(value);
      this.heapifyUp(this.heap.length - 1);
    }
  }

  /**
   * Removes and returns the element with the highest priority from the queue.
   *
   * @example
   * ```typescript
   * const queue = new Queue<number>((a, b) => a - b); // Min-heap
   * queue.enqueue(10, 5, 20);
   * const highestPriority = queue.dequeue();
   * console.log(highestPriority); // 5
   * console.log(queue.size); // 2
   * ```
   *
   * @returns {T | undefined} The element with the highest priority, or `undefined` if
   *   the queue is empty.
   */
  public dequeue(): T | undefined {
    if (this.heap.length === 0) {
      return undefined;
    }

    const root = this.heap[0]!;
    this.lastHeap = root;

    if (this.heap.length <= 1) {
      this.heap.pop();
      return root;
    }

    this.heap[0] = this.heap.pop()!;
    this.heapifyDown(0);

    return root;
  }

  /**
   * Removes all elements from the queue.
   *
   * @example
   * ```typescript
   * const queue = new Queue<number>((a, b) => a - b);
   * queue.enqueue(10, 5, 20);
   * queue.clear();
   * console.log(queue.size); // 0
   * ```
   *
   * @returns {void}
   */
  public clear(): void {
    this.heap.length = 0;
    this.lastHeap = undefined;
  }

  /**
   * Finds the first element in the underlying heap that satisfies the provided
   * testing function. Note: This method iterates through the heap without regard
   * to priority order.
   *
   * @example
   * ```typescript
   * const queue = new Queue<{ id: number, name: string }>((a, b) => a.id - b.id);
   * queue.enqueue({ id: 1, name: 'one' }, { id: 2, name: 'two' });
   * const found = queue.find(item => item.name === 'two');
   * console.log(found); // { id: 2, name: 'two' }
   * ```
   *
   * @param {(value: T) => boolean} predicate A function to execute on each value in the heap.
   *   It should return `true` if the element is found.
   * @returns {T | undefined} The first element in the heap that satisfies the predicate,
   *   or `undefined` if no such element is found.
   */
  public find(predicate: (value: T) => boolean): T | undefined {
    return this.heap.find(predicate);
  }

  /**
   * Finds an element using a predicate, updates it, and re-balances the heap.
   * If the element is an object, the new value is merged into the existing element.
   * Otherwise, the element is replaced.
   *
   * @example
   * ```typescript
   * const queue = new Queue<{ id: number, val: number }>((a, b) => a.val - b.val);
   * queue.enqueue({ id: 1, val: 10 }, { id: 2, val: 5 });
   *
   * // Update existing item
   * queue.update(item => item.id === 1, { val: 2 });
   * console.log(queue.peek()); // { id: 2, val: 5 }
   *
   * // Upsert a new item
   * queue.update(item => item.id === 3, { id: 3, val: 1 }, true);
   * console.log(queue.peek()); // { id: 3, val: 1 }
   * ```
   *
   * @param {(value: T) => boolean} predicate A function to find the element to update.
   * @param {T} value The new value or partial value to merge.
   * @param {boolean=} [upsert=false] If `true`, adds the value as a new element if no
   *   existing element matches the predicate.
   * @returns {T | undefined} The updated or upserted element, or `undefined` if no
   *   element was found and `upsert` is `false`.
   */
  public update(predicate: (value: T) => boolean, value: T, upsert: boolean = false): T | undefined {
    const index = this.heap.findIndex(predicate);

    if (index === -1) {
      if (upsert) {
        this.enqueue(value);
        return value;
      }
      return undefined;
    }

    let item = this.heap[index]!;
    if (isObjectLike(item) && isObjectLike(value)) {
      merge(item, value);
    } else {
      this.heap[index] = value;
      item = value!;
    }

    const newIndex = this.heapifyUp(index);
    this.heapifyDown(newIndex);

    return item;
  }

  /**
   * Finds and removes an element from the queue using a predicate.
   * After removal, the heap is re-balanced.
   *
   * @example
   * ```typescript
   * const queue = new Queue<number>((a, b) => a - b);
   * queue.enqueue(10, 5, 20); // Heap contains [5, 10, 20]
   * const deleted = queue.delete(value => value === 10);
   * console.log(deleted); // 10
   * console.log(queue.size); // 2
   * console.log(queue.peek()); // 5
   * ```
   *
   * @param {(value: T) => boolean} predicate A function to find the element to remove.
   * @returns {T | undefined} The removed element, or `undefined` if no element
   *   was found.
   */
  public delete(predicate: (value: T) => boolean): T | undefined {
    const index = this.heap.findIndex(predicate);
    if (index === -1) {
      return undefined;
    }

    const removed = this.heap[index]!;

    if (index === this.heap.length - 1) {
      this.heap.pop();
      return removed;
    }

    this.heap[index] = this.heap.pop()!;
    const newIndex = this.heapifyUp(index);
    this.heapifyDown(newIndex);

    return removed;
  }

  /**
   * Returns an iterator that consumes the queue, yielding elements in priority order.
   * Note: This is a destructive operation; the queue will be empty after iteration.
   *
   * @example
   * ```typescript
   * const queue = new Queue<number>((a, b) => a - b);
   * queue.enqueue(10, 5, 20);
   *
   * const sorted = [];
   * for (const value of queue) {
   *   sorted.push(value);
   * }
   * console.log(sorted); // [5, 10, 20]
   * console.log(queue.size); // 0
   * ```
   *
   * @returns {IterableIterator<T>} An iterator for the elements in the queue.
   */
  public *[Symbol.iterator](): IterableIterator<T> {
    while (this.heap.length !== 0) {
      yield this.dequeue()!;
    }
  }

  /**
   * Moves an element up the heap to maintain the heap property.
   * This is called after an element is inserted or its priority increases.
   *
   * @param {number} index The index of the element to move up.
   * @returns {number} The new index of the element after the heapify operation.
   */
  protected heapifyUp(index: number): number {
    let currentIndex = index;

    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex - 1) / 2);
      if (this.compare(this.heap[currentIndex]!, this.heap[parentIndex]!) >= 0) {
        break;
      }

      swap(this.heap, currentIndex, parentIndex);
      currentIndex = parentIndex;
    }

    return currentIndex;
  }

  /**
   * Moves an element down the heap to maintain the heap property.
   * This is called after an element is removed or its priority decreases.
   *
   * @param {number} index The index of the element to move down.
   * @returns {number} The new index of the element after the heapify operation.
   */
  protected heapifyDown(index: number): number {
    let currentIndex = index;
    const size = this.heap.length;

    while (currentIndex < size) {
      let smallestIndex = currentIndex;
      const leftIndex = 2 * currentIndex + 1;
      const rightIndex = 2 * currentIndex + 2;

      if (leftIndex < size && this.compare(this.heap[leftIndex]!, this.heap[smallestIndex]!) < 0) {
        smallestIndex = leftIndex;
      }

      if (rightIndex < size && this.compare(this.heap[rightIndex]!, this.heap[smallestIndex]!) < 0) {
        smallestIndex = rightIndex;
      }

      if (smallestIndex === currentIndex) {
        break;
      }

      swap(this.heap, currentIndex, smallestIndex);
      currentIndex = smallestIndex;
    }

    return currentIndex;
  }
}
