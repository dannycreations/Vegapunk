import { isObjectLike } from '@vegapunk/utilities/common'
import { swap } from '../utils/common'
import { type Comparator } from '../utils/comparators'

/**
 * A generic priority queue implementation. Elements are ordered based on a
 * {@link Comparator} function provided at construction.
 *
 * @template T The type of elements held in the queue.
 */
export class Queue<T> {
  /**
   * Initializes a new instance of the {@link Queue} class.
   *
   * @example
   * // Max-heap for numbers (higher numbers have higher priority)
   * const numberMaxHeap = new Queue<number>((a, b) => b - a);
   * numberMaxHeap.enqueue(10, 50, 20);
   * console.log(numberMaxHeap.dequeue()); // 50
   *
   * // Min-heap for strings (lexicographical order)
   * const stringMinHeap = new Queue<string>((a, b) => a.localeCompare(b));
   * stringMinHeap.enqueue("banana", "apple", "cherry");
   * console.log(stringMinHeap.dequeue()); // "apple"
   *
   * // Default behavior (order of insertion, or undefined if not a stable sort)
   * const defaultQueue = new Queue<number>();
   * defaultQueue.enqueue(3, 1, 2);
   * // console.log(defaultQueue.dequeue()); // Behavior depends on default () => 0 comparator.
   *
   * @param {Comparator<T>} [compare=() => 0] A {@link Comparator} function that
   *   defines the priority order of elements. If `compare(a, b)` returns a
   *   positive number, `a` has higher priority than `b`. If not provided,
   *   a default comparator is used which treats all elements as having equal priority.
   */
  public constructor(compare: Comparator<T> = () => 0) {
    this.compare = compare
  }

  /**
   * Gets the number of elements currently in the queue.
   *
   * @example
   * const queue = new Queue<number>();
   * queue.enqueue(1, 2);
   * console.log(queue.size); // 2
   * queue.dequeue();
   * console.log(queue.size); // 1
   *
   * @returns {number} The total number of elements in the queue.
   */
  public get size(): number {
    return this.heap.length
  }

  /**
   * Gets the last element that was removed from the queue via {@link dequeue}.
   *
   * @example
   * const queue = new Queue<number>((a, b) => b - a); // Max-heap
   * queue.enqueue(10, 20);
   * const dequeuedItem = queue.dequeue(); // dequeuedItem will be 20
   * console.log(queue.last); // 20
   * console.log(queue.dequeue()); // 10
   * console.log(queue.last); // 10
   *
   * @returns {T | undefined} The last element dequeued, or `undefined` if no element
   *   has been dequeued yet or the queue was empty at the last dequeue operation.
   */
  public get last(): T | undefined {
    return this.lastHeap
  }

  /**
   * Retrieves the element at the specified index in the underlying heap structure
   * without removing it. By default (index 0), it retrieves the highest-priority element.
   *
   * @example
   * const queue = new Queue<number>((a, b) => b - a); // Max-heap
   * queue.enqueue(10, 5, 20);
   * console.log(queue.peek());    // 20 (highest priority element)
   * console.log(queue.peek(0));   // 20 (same as peek())
   * // Fetching other elements by index directly inspects the internal heap array:
   * const anElement = queue.peek(1); // Retrieves an element from the heap array.
   * if (anElement !== undefined) {
   *   console.log('Element at index 1:', anElement); // e.g., 10 or 5
   * }
   *
   * @param {number} [index=0] The zero-based index of the element to retrieve
   *   from the internal heap array.
   * @returns {T | undefined} The element at the specified `index`, or `undefined`
   *   if the index is out of bounds.
   */
  public peek(index: number = 0): T | undefined {
    return this.heap[index]
  }

  /**
   * Adds one or more elements to the priority queue. Each element is placed
   * according to its priority defined by the {@link Comparator}.
   *
   * @example
   * const queue = new Queue<string>();
   * queue.enqueue('apple', 'banana');
   * console.log(queue.size); // 2
   * queue.enqueue('cherry');
   * console.log(queue.size); // 3
   *
   * @param {...T[]} values The elements to add to the queue.
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
   * The `last` property is updated with the dequeued element.
   *
   * @example
   * const queue = new Queue<number>((a, b) => b - a); // Max-heap
   * queue.enqueue(10, 20, 5);
   * console.log(queue.dequeue()); // 20
   * console.log(queue.dequeue()); // 10
   * console.log(queue.last);      // 10
   * console.log(queue.dequeue()); // 5
   * console.log(queue.dequeue()); // undefined
   *
   * @returns {T | undefined} The element with the highest priority, or `undefined`
   *   if the queue is empty.
   */
  public dequeue(): T | undefined {
    if (this.size === 0) {
      return undefined
    }

    const root = this.heap[0]!
    if (this.size <= 1) {
      this.heap.pop()
      this.lastHeap = root
      return root
    }

    this.heap[0] = this.heap.pop()!
    this.heapifyDown(0)
    this.lastHeap = root
    return root
  }

  /**
   * Removes all elements from the queue.
   *
   * @example
   * const queue = new Queue<number>();
   * queue.enqueue(1, 2, 3);
   * console.log(queue.size); // 3
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
   * Finds the first element in the queue that satisfies the provided testing
   * function. The search order is based on the internal heap array's iteration order,
   * not necessarily the priority order.
   *
   * @example
   * const queue = new Queue<{ id: number; name: string }>();
   * queue.enqueue({ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' });
   * const bob = queue.find(item => item.name === 'Bob');
   * console.log(bob); // { id: 2, name: 'Bob' } or undefined if not found
   * const charlie = queue.find(item => item.name === 'Charlie');
   * console.log(charlie); // undefined
   *
   * @param {(value: T) => boolean} predicate A function to execute on each element,
   *   taking the element as an argument. It should return `true` to indicate a match.
   * @returns {T | undefined} The first element that satisfies the `predicate`, or
   *   `undefined` if no such element is found.
   */
  public find(predicate: (value: T) => boolean): T | undefined {
    return this.heap.find(predicate)
  }

  /**
   * Updates the first element found by the predicate with the new value.
   * If the element and the new value are both objects, `Object.assign` is used
   * to merge them; otherwise, the element is replaced. After updating, heap
   * properties are restored. If `upsert` is true and no element is found,
   * the new value is enqueued using {@link enqueue}.
   *
   * @example
   * const queue = new Queue<{ id: number; value: string }>((a, b) => b.id - a.id);
   * queue.enqueue({ id: 1, value: 'one' }, { id: 2, value: 'two' });
   *
   * // Update existing element (properties are merged)
   * const updated = queue.update(item => item.id === 1, { value: 'uno' });
   * console.log(updated); // { id: 1, value: 'uno' }
   *
   * // Attempt to update non-existing element without upsert
   * const notFound = queue.update(item => item.id === 3, { id:3, value: 'three' });
   * console.log(notFound); // undefined
   *
   * // Upsert a new element
   * const upserted = queue.update(item => item.id === 3, { id: 3, value: 'tres' }, true);
   * console.log(upserted); // { id: 3, value: 'tres' }
   * console.log(queue.size); // 3
   *
   * @param {(value: T) => boolean} predicate A function to find the element to update.
   * @param {T} value The new value for the element.
   * @param {boolean} [upsert=false] If `true`, enqueues the `value` if no element
   *  matches the `predicate`.
   * @returns {T | undefined} The updated or newly enqueued element. Returns `undefined`
   *   if no element was found and `upsert` is `false`.
   */
  public update(predicate: (value: T) => boolean, value: T, upsert: boolean = false): T | undefined {
    const index = this.heap.findIndex(predicate)
    if (index === -1) {
      if (upsert) {
        this.enqueue(value)
        return value
      }
      return undefined
    }

    let item = this.heap[index]!
    if (isObjectLike(item) && isObjectLike(value)) {
      Object.assign(item, value)
    } else {
      this.heap[index] = value
      item = value!
    }

    const newIndex = this.heapifyUp(index)
    this.heapifyDown(newIndex)
    return item
  }

  /**
   * Deletes the first element found by the predicate from the queue and returns it.
   * After deletion, heap properties are restored.
   *
   * @example
   * const queue = new Queue<string>();
   * queue.enqueue('cat', 'dog', 'fish', 'bird');
   * const deleted = queue.delete(item => item === 'dog');
   * console.log(deleted); // 'dog'
   * console.log(queue.size); // 3
   * // Queue now contains 'cat', 'fish', 'bird' (order depends on comparator and heap state)
   *
   * const notFound = queue.delete(item => item === 'lion');
   * console.log(notFound); // undefined
   *
   * @param {(value: T) => boolean} predicate A function to find the element to delete.
   * @returns {T | undefined} The deleted element, or `undefined` if no element
   *   matches the `predicate`.
   */
  public delete(predicate: (value: T) => boolean): T | undefined {
    const index = this.heap.findIndex(predicate)
    if (index === -1) {
      return undefined
    }

    const removed = this.heap[index]!
    if (index === this.size - 1) {
      this.heap.pop()
      return removed
    }

    this.heap[index] = this.heap.pop()!
    const newIndex = this.heapifyUp(index)
    this.heapifyDown(newIndex)
    return removed
  }

  /**
   * Returns an {@link IterableIterator} that consumes the queue, yielding elements
   * in priority order (highest priority first). This process empties the queue.
   *
   * @example
   * const queue = new Queue<number>((a, b) => b - a); // Max-heap
   * queue.enqueue(10, 5, 20);
   *
   * const sortedElements = [];
   * for (const item of queue) {
   *   sortedElements.push(item); // Iterates 20, then 10, then 5
   * }
   * console.log(sortedElements); // [20, 10, 5]
   * console.log(queue.size); // 0, as the iterator consumes the queue
   *
   * @returns {IterableIterator<T>} An iterator for the elements in the queue,
   *   ordered by priority.
   */
  public *[Symbol.iterator](): IterableIterator<T> {
    while (this.size !== 0) {
      yield this.dequeue()!
    }
  }

  /**
   * Restores the heap property by moving an element up the heap from the given
   * index until its correct position is found. This is typically called after an
   * element is added to the end of the heap (as in {@link enqueue}) or an
   * element's priority is increased (as in {@link update}).
   *
   * @example
   * // Internal method: Not intended for direct external use.
   * // Called, for example, within enqueue(value):
   * // this.heap.push(value);
   * // this.newIndex = this.heapifyUp(this.size - 1);
   *
   * @param {number} index The starting index of the element to move upwards.
   * @returns {number} The new index of the element after heapifying up.
   */
  protected heapifyUp(index: number): number {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2)
      if (this.compare(this.heap[index]!, this.heap[parentIndex]!) <= 0) {
        break
      }

      swap(this.heap, index, parentIndex)
      index = parentIndex
    }
    return index
  }

  /**
   * Restores the heap property by moving an element down the heap from the given
   * index until its correct position is found. This is typically called after the
   * root element is replaced with the last element in the heap (as in {@link dequeue})
   * or an element's priority is decreased (as in {@link update}).
   *
   * @example
   * // Internal method: Not intended for direct external use.
   * // Called, for example, within dequeue():
   * // this.heap[0] = this.heap.pop();
   * // this.newIndex = this.heapifyDown(0);
   *
   * @param {number} index The starting index of the element to move downwards.
   * @returns {number} The new index of the element after heapifying down.
   */
  protected heapifyDown(index: number): number {
    const size = this.size
    while (index < size) {
      let highestIndex = index
      const leftIndex = 2 * index + 1
      const rightIndex = 2 * index + 2
      if (leftIndex < size && this.compare(this.heap[leftIndex]!, this.heap[highestIndex]!) > 0) {
        highestIndex = leftIndex
      }
      if (rightIndex < size && this.compare(this.heap[rightIndex]!, this.heap[highestIndex]!) > 0) {
        highestIndex = rightIndex
      }
      if (highestIndex === index) {
        break
      }

      swap(this.heap, index, highestIndex)
      index = highestIndex
    }
    return index
  }

  protected lastHeap?: T
  protected readonly heap: T[] = []
  protected readonly compare: Comparator<T>
}
