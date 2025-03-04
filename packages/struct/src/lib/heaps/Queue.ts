import { isObjectLike } from '@vegapunk/utilities/common'
import { swap } from '../utils/common'
import { type Comparator } from '../utils/comparators'

/**
 * A priority queue implementation based on a heap.
 *
 * This class provides a priority queue where elements are ordered based on a comparison function provided
 * during the creation of the queue. The queue supports common operations like enqueueing, dequeueing,
 * peeking, updating, and deleting elements, as well as iterating through the queue.
 *
 * @template T - The type of elements in the queue.
 */
export class Queue<T> {
	/**
	 * Creates a new queue with a comparator function.
	 *
	 * @param {Comparator<T>} compare - A function used to compare elements in the queue.
	 *
	 * @example
	 * const queue = new Queue<number>((a, b) => a - b); // Min-heap for numbers.
	 */
	public constructor(compare: Comparator<T>) {
		this.compare = compare
	}

	/**
	 * Gets the size of the queue.
	 *
	 * @returns {number} The number of elements in the queue.
	 *
	 * @example
	 * const queue = new Queue<number>((a, b) => a - b);
	 * queue.enqueue(1, 2, 3);
	 * console.log(queue.size); // 3
	 */
	public get size(): number {
		return this.heap.length
	}

	/**
	 * Gets the last element dequeued from the queue.
	 *
	 * @returns {T | undefined} The last element dequeued, or undefined if no elements have been dequeued.
	 *
	 * @example
	 * const queue = new Queue<number>((a, b) => a - b);
	 * queue.enqueue(1, 2, 3);
	 * queue.dequeue(); // 1
	 * console.log(queue.last); // 1
	 */
	public get last(): T | undefined {
		return this.lastHeap
	}

	/**
	 * Peeks at the element at the given index in the queue without removing it.
	 *
	 * @param {number} [i=0] - The index to peek at (defaults to 0).
	 * @returns {T | undefined} The element at the given index, or undefined if the index is out of bounds.
	 *
	 * @example
	 * const queue = new Queue<number>((a, b) => a - b);
	 * queue.enqueue(1, 2, 3);
	 * console.log(queue.peek(1)); // 2
	 */
	public peek(i: number = 0): T | undefined {
		return this.heap[i]
	}

	/**
	 * Adds one or more elements to the queue.
	 *
	 * @param {...T[]} values - The values to enqueue.
	 * @returns {void}
	 *
	 * @example
	 * const queue = new Queue<number>((a, b) => a - b);
	 * queue.enqueue(1, 2, 3);
	 * console.log(queue.size); // 3
	 */
	public enqueue(...values: T[]): void {
		for (let i = 0; i < values.length; i++) {
			this.heap.push(values[i])
			this.heapifyUp(this.size - 1)
		}
	}

	/**
	 * Removes and returns the highest priority element from the queue.
	 *
	 * @returns {T | undefined} The highest priority element, or undefined if the queue is empty.
	 *
	 * @example
	 * const queue = new Queue<number>((a, b) => a - b);
	 * queue.enqueue(1, 2, 3);
	 * console.log(queue.dequeue()); // 1
	 * console.log(queue.size); // 2
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
	 * Clears the queue by removing all elements.
	 *
	 * @returns {void}
	 *
	 * @example
	 * const queue = new Queue<number>((a, b) => a - b);
	 * queue.enqueue(1, 2, 3);
	 * queue.clear();
	 * console.log(queue.size); // 0
	 */
	public clear(): void {
		this.heap.length = 0
	}

	/**
	 * Finds the first element that satisfies the given predicate.
	 *
	 * @param {(value: T) => boolean} predicate - A function to test each element.
	 * @returns {T | undefined} The first element that satisfies the predicate, or undefined if no element matches.
	 *
	 * @example
	 * const queue = new Queue<number>((a, b) => a - b);
	 * queue.enqueue(1, 2, 3);
	 * console.log(queue.find(value => value > 1)); // 2
	 */
	public find(predicate: (value: T) => boolean): T | undefined {
		return this.heap.find(predicate)
	}

	/**
	 * Updates an element in the queue or adds it if it doesn't exist.
	 *
	 * @param {(value: T) => boolean} predicate - A function to find the element to update.
	 * @param {T} value - The new value to set.
	 * @param {boolean} [upsert=false] - If true, the value will be added if not found (defaults to false).
	 * @returns {T | undefined} The updated or added element, or undefined if not found and upsert is false.
	 *
	 * @example
	 * const queue = new Queue<number>((a, b) => a - b);
	 * queue.enqueue(1, 2, 3);
	 * queue.update(value => value === 2, 4);
	 * console.log(queue.peek(1)); // 4
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
		if (isObjectLike(item)) {
			Object.assign(item, value)
		} else {
			this.heap[index] = value
		}

		this.heapifyUp(index)
		this.heapifyDown(index)
		return item
	}

	/**
	 * Deletes the first element that satisfies the given predicate.
	 *
	 * @param {(value: T) => boolean} predicate - A function to find the element to delete.
	 * @returns {T | undefined} The deleted element, or undefined if not found.
	 *
	 * @example
	 * const queue = new Queue<number>((a, b) => a - b);
	 * queue.enqueue(1, 2, 3);
	 * queue.delete(value => value === 2);
	 * console.log(queue.size); // 2
	 */
	public delete(predicate: (value: T) => boolean): T | undefined {
		const index = this.heap.findIndex(predicate)
		if (index === -1) return undefined

		const item = this.heap[index]
		this.heap[index] = this.heap.pop()!
		this.heapifyDown(index)
		this.heapifyUp(index)
		return item
	}

	/**
	 * Iterator for dequeuing all elements from the queue.
	 *
	 * @returns {IterableIterator<T>} An iterator that yields the dequeued elements one by one.
	 *
	 * @example
	 * const queue = new Queue<number>((a, b) => a - b);
	 * queue.enqueue(1, 2, 3);
	 * for (const value of queue) {
	 *   console.log(value); // 1, 2, 3
	 * }
	 */
	public *[Symbol.iterator](): IterableIterator<T> {
		while (this.size) yield this.dequeue()!
	}

	/**
	 * Moves the element at the given index up to maintain heap property.
	 *
	 * @param {number} index - The index of the element to move up.
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
	 * Moves the element at the given index down to maintain heap property.
	 *
	 * @param {number} index - The index of the element to move down.
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
