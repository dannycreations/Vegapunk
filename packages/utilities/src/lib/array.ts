export function pull<T>(array: T[], values: T[]) {
	const valueSet = new Set(values)
	remove(array, (r) => valueSet.has(r))
	return array
}

export function remove<T>(array: T[], predicate: (value: T, index: number, array: T[]) => boolean) {
	const removed: T[] = []
	for (let i = array.length - 1; i >= 0; i--) {
		if (predicate(array[i], i, array)) {
			removed.push(...array.splice(i, 1))
		}
	}
	return removed
}
