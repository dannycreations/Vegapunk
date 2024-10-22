import { get, has, isObjectLike } from 'es-toolkit/compat'
import { DeepRequired, NestedKeyOf, NonNullObject, ValueAtPath } from './types'

function isSpecialProperty(key: string) {
	return key === '__proto__' || key === 'constructor' || key === 'prototype'
}

export function defaultsDeep<A extends NonNullObject, B extends Partial<A> = Partial<A>>(target: A, ...sources: B[]) {
	for (const source of sources) {
		if (!isObjectLike(source)) continue
		for (const [key, sourceValue] of Object.entries(source)) {
			if (isSpecialProperty(key)) continue

			const targetValue = target[key as keyof A]
			if (isObjectLike(targetValue) && isObjectLike(sourceValue)) {
				defaultsDeep(targetValue, sourceValue)
			} else if (typeof targetValue === 'undefined') {
				target[key as keyof A] = sourceValue as A[keyof A]
			}
		}
	}
	return target as DeepRequired<A & B>
}

export function strictGet<
	D extends number = 3,
	T = unknown,
	P extends NestedKeyOf<D, T> = NestedKeyOf<D, T>,
	V extends ValueAtPath<D, T, P> = ValueAtPath<D, T, P>,
>(obj: T, path: P, value?: V): ValueAtPath<D, T, P, V> {
	return get(obj, path, value) as ValueAtPath<D, T, P, V>
}

export function strictHas<D extends number = 3, T = unknown, P extends NestedKeyOf<D, T> = NestedKeyOf<D, T>>(obj: T, path: P): boolean {
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
