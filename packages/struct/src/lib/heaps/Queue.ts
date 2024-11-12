import { isObjectLike } from '@vegapunk/utilities/common'
import { type Comparator } from '../utils/comparators'

export class Queue<T> {
	public constructor(protected readonly compare: Comparator<T>) {}

	public get size(): number {
		return this.heap.length
	}

	public get last(): T | undefined {
		return this.lastHeap
	}

	public peek(i = 0): T | undefined {
		return this.heap[i]
	}

	public enqueue(...values: T[]): void {
		for (let i = 0; i < values.length; i++) {
			this.heap.push(values[i])
			this.heapifyUp(this.size - 1)
		}
	}

	public dequeue(): T | undefined {
		if (this.size === 0) return undefined

		const item = this.heap[0]
		this.heap[0] = this.heap.pop()!
		this.heapifyDown(0)

		this.lastHeap = item
		return item
	}

	public clear(): void {
		this.heap.length = 0
	}

	public find(predicate: (value: T) => boolean): T | undefined {
		return this.heap.find(predicate)
	}

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

	public delete(predicate: (value: T) => boolean): T | undefined {
		const index = this.heap.findIndex(predicate)
		if (index === -1) return undefined

		const item = this.heap[index]
		this.heap[index] = this.heap.pop()!
		this.heapifyDown(index)
		this.heapifyUp(index)
		return item
	}

	public *[Symbol.iterator](): IterableIterator<T> {
		while (this.size) yield this.dequeue()!
	}

	protected heapifyUp(index: number): void {
		while (index > 0) {
			const parentIndex = Math.floor((index - 1) / 2)
			if (this.compare(this.heap[index], this.heap[parentIndex]) <= 0) break

			swap(this.heap, index, parentIndex)
			index = parentIndex
		}
	}

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
}

export function swap<T>(heap: T[], a: number, b: number): void {
	;[heap[a], heap[b]] = [heap[b], heap[a]]
}
