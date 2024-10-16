import { isObject } from 'es-toolkit/compat'
import { DeepRequired, NestedKeyOf, NonNullObject, ValueAtPath } from './types'

function isSpecialProperty(key: string) {
	return key === '__proto__' || key === 'constructor' || key === 'prototype'
}

export function defaultsDeep<A extends NonNullObject, B extends Partial<A> = Partial<A>>(target: A, ...sources: B[]) {
	for (const source of sources) {
		if (!isObject(source)) continue
		for (const [key, sourceValue] of Object.entries(source)) {
			if (isSpecialProperty(key)) continue

			const targetValue = target[key as keyof A]
			if (isObject(targetValue) && isObject(sourceValue)) {
				defaultsDeep(targetValue, sourceValue)
			} else if (typeof targetValue === 'undefined') {
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
	return typeof result === 'undefined' ? value : (result as ValueAtPath<T, V>)
}

export function strictHas<T extends NonNullObject>(obj: T, key: NestedKeyOf<T>) {
	return typeof strictGet(obj, key) !== 'undefined'
}
