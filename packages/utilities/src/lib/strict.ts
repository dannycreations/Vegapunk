import { NestedKeyOf } from './types'

export function strictGet<T, V>(obj: V, key: NestedKeyOf<V>, value?: T) {
	let result: unknown = obj
	const keys = key.split('.') as Array<keyof T>
	for (const key of keys) {
		if (result && typeof result === 'object' && key in result) {
			result = (result as Record<keyof any, unknown>)[key]
		} else return value
	}
	return result === undefined ? value : (result as T)
}

export function strictHas<T>(obj: T, key: NestedKeyOf<T>) {
	return strictGet(obj, key) !== undefined
}
