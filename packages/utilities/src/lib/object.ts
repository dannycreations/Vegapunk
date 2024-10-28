import { isError } from 'es-toolkit'
import { get, has, isObjectLike } from 'es-toolkit/compat'
import { NestedKeyOf, ValueAtPath } from './types'

function isSpecialProperty(key: string) {
	return key === '__proto__' || key === 'constructor' || key === 'prototype'
}

export function defaultsDeep<A, B extends A = A>(target: Partial<A>, ...sources: Partial<B>[]) {
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
	return target as A & B
}

export function strictGet<T, P extends NestedKeyOf<T> = NestedKeyOf<T>, V extends ValueAtPath<T, P> = ValueAtPath<T, P>>(obj: T, path: P, value?: V) {
	return get(obj, path, value) as NonNullable<ValueAtPath<T, P>> | V
}

export function strictHas<T, P extends NestedKeyOf<T> = NestedKeyOf<T>>(obj: T, path: P) {
	return has(obj, path) as boolean
}

export function isErrorLike<T>(error: unknown): error is ErrorLike & T {
	if (isError(error)) return true

	const isObject = isObjectLike(error)
	const hasCode = isObject && 'code' in error
	const hasStack = isObject && 'stack' in error
	const hasMessage = isObject && 'message' in error
	return [hasCode, hasStack, hasMessage].filter(Boolean).length >= 2
}

export interface ErrorLike {
	code: unknown
	stack: unknown
	message: unknown
}
