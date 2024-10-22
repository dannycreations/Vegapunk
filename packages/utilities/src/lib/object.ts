import { get, has, isObject, isObjectLike } from 'es-toolkit/compat'
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

export function strictGet<T, P extends NestedKeyOf<T>, V extends ValueAtPath<T, P>>(obj: T, path: P, value?: V): ValueAtPath<T, P, V> {
	return get(obj, path, value) as ValueAtPath<T, P, V>
}

export function strictHas<T, P extends NestedKeyOf<T>>(obj: T, path: P): boolean {
	return has(obj, path)
}

export function isErrorLike<T = unknown>(error: unknown): error is ErrorLike & T {
	return isObjectLike(error) && ('code' in error || 'stack' in error || 'message' in error)
}

export interface ErrorLike {
	code: unknown
	stack: unknown
	message: unknown
}
