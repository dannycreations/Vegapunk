export function ascend(a: number, b: number): number {
	return a < b ? -1 : a > b ? 1 : 0
}

export function descend(a: number, b: number): number {
	return a > b ? -1 : a < b ? 1 : 0
}

export type Comparator<T> = (a: T, b: T) => number
