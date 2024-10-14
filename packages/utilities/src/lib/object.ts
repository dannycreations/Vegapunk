import { DeepRequired, NestedKeyOf, NonNullObject, ValueAtPath } from './types'

export function isObject(val: unknown): val is Record<string, unknown> {
	return val !== null && typeof val === 'object' && !Array.isArray(val)
}

export function defaultsDeep<A extends NonNullObject, B extends Partial<A> = Partial<A>>(target: A, ...sources: B[]) {
	for (const source of sources) {
		if (!isObject(source)) continue
		for (const [key, sourceValue] of Object.entries(source)) {
			const targetValue = target[key as keyof A]
			if (isObject(targetValue) && isObject(sourceValue)) {
				defaultsDeep(targetValue as NonNullObject, sourceValue)
			} else if (targetValue === undefined) {
				target[key as keyof A] = sourceValue as A[keyof A]
			}
		}
	}
	return target as DeepRequired<A & B>
}

export function strictGet<T extends NonNullObject, V extends NestedKeyOf<T>>(obj: T, path: V, value?: ValueAtPath<T, V>) {
	let result: unknown = obj
	const keys = path.split('.')
	for (const key of keys) {
		if (result && typeof result === 'object' && key in result) {
			result = (result as Record<string, unknown>)[key]
		} else return value
	}
	return result === undefined ? value : (result as ValueAtPath<T, V>)
}

export function strictHas<T extends NonNullObject>(obj: T, key: NestedKeyOf<T>) {
	return strictGet(obj, key) !== undefined
}
