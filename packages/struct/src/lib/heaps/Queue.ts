import { isObjectLike } from '@vegapunk/utilities/common'
import { swap } from '../utils/common'
import { type Comparator } from '../utils/comparators'

/**
 * A priority queue implementation using a binary heap.
 * The queue orders elements based on a provided comparator function.
 *
 * @template T The type of elements held in the queue.
 */
export class Queue<T> {
  /**
   * Creates an instance of Queue.
   *
   * @param {Comparator<T>} compare Function used to determine the order of elements.
   *   It is expected to return:
   *   - A positive value if `a` has higher priority than `b`.
   *   - A negative value if `a` has lower priority than `b`.
   *   - Zero if `a` and `b` have equal priority.
   *   For a max-heap (largest elements first), `(a, b) => a - b` can be used for numbers.
   *   For a min-heap (smallest elements first), `(a, b) => b - a` can be used for numbers.
   */
  public constructor(compare: Comparator<T>) {
    this.compare = compare
  }

  /**
   * Gets the number of elements in the queue.
   *
   * @example
   * const queue = new Queue<number>((a, b) => a - b);
   * queue.enqueue(10, 20);
   * console.log(queue.size); // 2
   *
   * @returns {number} The number of elements in the queue.
   */
  public get size(): number {
    return this.heap.length
  }

  /**
   * Gets the last element that was dequeued from the queue.
   *
   * @example
   * const queue = new Queue<number>((a, b) => a - b);
   * queue.enqueue(10);
   * queue.dequeue(); // Dequeues 10
   * console.log(queue.last); // 10
   *
   * @returns {T | undefined} The last element dequeued, or undefined if no element has been dequeued or the queue was empty.
   */
  public get last(): T | undefined {
    return this.lastHeap
  }

  /**
   * Retrieves the element at the specified index in the heap array without removing it.
   * By default, it peeks at the element with the highest priority (the root of the heap).
   * Note: The heap is an array-based representation, and indices other than 0 might not
   * correspond to a fixed priority order beyond the root.
   *
   * @example
   * const queue = new Queue<number>((a, b) => a - b); // Max-heap
   * queue.enqueue(20, 10, 5); // Enqueueing in this order ensures heap structure [20, 10, 5]
   * console.log(queue.peek()); // 20
   * console.log(queue.peek(1)); // 10
   *
   * @param {number=} [i=0] The zero-based index of the element to retrieve from the internal heap array.
   * @returns {T | undefined} The element at the specified index, or undefined if the index is out of bounds.
   */
  public peek(i: number = 0): T | undefined {
    return this.heap[i]
  }

  /**
   * Adds one or more values to the queue. Each value is placed according to its priority.
   *
   * @example
   * const queue = new Queue<number>((a, b) => a - b); // Max-heap
   * queue.enqueue(10);
   * queue.enqueue(5, 20); // Adds 5 and 20
   * console.log(queue.peek()); // 20
   * console.log(queue.size); // 3
   *
   * @param {...T} values The values to add to the queue.
   * @returns {void}
   */
  public enqueue(...values: T[]): void {
    for (let i = 0; i < values.length; i++) {
      this.heap.push(values[i])
      this.heapifyUp(this.size - 1)
    }
  }

  /**
   * Removes and returns the element with the highest priority from the queue.
   *
   * @example
   * const queue = new Queue<number>((a, b) => a - b); // Max-heap
   * queue.enqueue(10, 5, 20);
   * console.log(queue.dequeue()); // 20
   * console.log(queue.dequeue()); // 10
   * console.log(queue.size); // 1
   *
   * @returns {T | undefined} The element with the highest priority, or undefined if the queue is empty.
   */
  public dequeue(): T | undefined {
    if (this.size === 0) return undefined

    const item = this.heap[0]
    this.heap[0] = this.heap.pop()!
    this.heapifyDown(0)

    this.lastHeap = item
    return item
  }

  /**
   * Removes all elements from the queue.
   *
   * @example
   * const queue = new Queue<number>((a, b) => a - b);
   * queue.enqueue(10, 20);
   * queue.clear();
   * console.log(queue.size); // 0
   * console.log(queue.peek()); // undefined
   *
   * @returns {void}
   */
  public clear(): void {
    this.heap.length = 0
  }

  /**
   * Finds the first element in the queue that satisfies the provided testing function.
   * This method iterates through the internal heap array, not necessarily in priority order.
   *
   * @example
   * const queue = new Queue<{id: number, val: string}>((a, b) => a.id - b.id); // Max-heap by id
   * queue.enqueue({id: 1, val: 'a'}, {id: 3, val: 'c'}, {id: 2, val: 'b'});
   * const found = queue.find(item => item.val === 'b');
   * console.log(found); // {id: 2, val: 'b'} (assuming it's found in the heap array)
   *
   * @param {(value: T) => boolean} predicate A function to execute on each value in the queue's internal array.
   * @returns {T | undefined} The first element that satisfies the condition, or undefined if no such element is found.
   */
  public find(predicate: (value: T) => boolean): T | undefined {
    return this.heap.find(predicate)
  }

  /**
   * Updates the first element found by the predicate with the new value.
   * After updating, the heap property is restored. If `upsert` is true and no element
   * is found, the new value is enqueued.
   * If the element is an object, `Object.assign` is used for the update; otherwise, it's replaced.
   *
   * @example
   * const queue = new Queue<{id: number, val: string}>((a, b) => a.id - b.id); // Max-heap by id
   * queue.enqueue({id: 1, val: 'a'}, {id: 2, val: 'b'});
   *
   * // Update existing
   * queue.update(item => item.id === 1, {id: 1, val: 'updated_a'});
   * // console.log(queue.find(item => item.id === 1)?.val); // 'updated_a'
   *
   * // Upsert new (if item with id 3 doesn't exist)
   * queue.update(item => item.id === 3, {id: 3, val: 'c'}, true);
   * // console.log(queue.find(item => item.id === 3)?.val); // 'c'
   *
   * @param {(value: T) => boolean} predicate A function to find the element to update.
   * @param {T} value The new value to update the element with or to enqueue.
   * @param {boolean=} [upsert=false] If true, enqueues the value if no element matches the predicate.
   * @returns {T | undefined} The updated or inserted element (a reference to the item in the queue),
   * or undefined if no element was found and upsert was false.
   */
  public update(predicate: (value: T) => boolean, value: T, upsert: boolean = false): T | undefined {
    const index = this.heap.findIndex(predicate)
    if (index === -1 && upsert) {
      this.enqueue(value)
      return value
    } else if (index === -1) {
      return undefined
    }

    const item = this.heap[index]
    if (isObjectLike(item) && isObjectLike(value)) {
      Object.assign(item, value)
    } else {
      this.heap[index] = value
    }

    this.heapifyUp(index)
    this.heapifyDown(index)
    return this.heap.includes(item) ? item : this.heap[this.heap.findIndex((el) => el === value)]
  }

  /**
   * Deletes the first element found by the predicate from the queue.
   * After deletion, the heap property is restored.
   *
   * @example
   * const queue = new Queue<{id: number, val: string}>((a, b) => a.id - b.id); // Max-heap by id
   * queue.enqueue({id: 1, val: 'a'}, {id: 2, val: 'b'});
   * const deleted = queue.delete(item => item.val === 'a');
   * console.log(deleted); // {id: 1, val: 'a'}
   * console.log(queue.size); // 1
   *
   * @param {(value: T) => boolean} predicate A function to find the element to delete.
   * @returns {T | undefined} The deleted element, or undefined if no element was found.
   */
  public delete(predicate: (value: T) => boolean): T | undefined {
    const index = this.heap.findIndex(predicate)
    if (index === -1) return undefined

    const item = this.heap[index]
    if (index === this.heap.length - 1) {
      this.heap.pop()
    } else {
      this.heap[index] = this.heap.pop()!
      this.heapifyDown(index)
      this.heapifyUp(index)
    }
    return item
  }

  /**
   * Returns an iterator that yields elements from the queue in priority order.
   * This process dequeues elements, so the queue will be empty after full iteration.
   *
   * @example
   * const queue = new Queue<number>((a, b) => a - b); // Max-heap
   * queue.enqueue(10, 5, 20); // Results in [20, 5, 10] or [20, 10, 5] internally
   *
   * const iteratedItems = [];
   * for (const item of queue) {
   *   iteratedItems.push(item); // 20, then 10, then 5 (in max-heap order)
   * }
   * console.log(iteratedItems); // [20, 10, 5]
   * console.log(queue.size); // 0, as iteration dequeues elements
   *
   * @returns {IterableIterator<T>} An iterator for the elements in the queue, ordered by priority.
   */
  public *[Symbol.iterator](): IterableIterator<T> {
    while (this.size) yield this.dequeue()!
  }

  /**
   * Restores the heap property by moving an element up the heap tree.
   * This method is called after an element is added to the heap or its priority increases.
   *
   * @param {number} index The index of the element to heapify up.
   * @returns {void}
   */
  protected heapifyUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2)
      if (this.compare(this.heap[index], this.heap[parentIndex]) <= 0) break

      swap(this.heap, index, parentIndex)
      index = parentIndex
    }
  }

  /**
   * Restores the heap property by moving an element down the heap tree.
   * This method is called after an element is removed from the top or its priority decreases.
   *
   * @param {number} index The index of the element to heapify down.
   * @returns {void}
   */
  protected heapifyDown(index: number): void {
    while (index < this.size) {
      let highestIndex = index
      const leftIndex = 2 * index + 1
      const rightIndex = 2 * index + 2

      if (leftIndex < this.size && this.compare(this.heap[leftIndex], this.heap[highestIndex]) > 0) {
        highestIndex = leftIndex
      }

      if (rightIndex < this.size && this.compare(this.heap[rightIndex], this.heap[highestIndex]) > 0) {
        highestIndex = rightIndex
      }

      if (highestIndex === index) break

      swap(this.heap, index, highestIndex)
      index = highestIndex
    }
  }

  protected lastHeap?: T
  protected readonly heap: T[] = []
  protected readonly compare: Comparator<T>
}
