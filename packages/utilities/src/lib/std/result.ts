import { Result } from '@sapphire/result'
import { isError, isObjectLike } from 'es-toolkit/compat'

export { Option, Result } from '@sapphire/result'

export function isErrorLike<T>(error: unknown): error is ErrorLike & T {
	if (isError(error)) return true

	const isObject = isObjectLike(error)
	const hasCode = isObject && 'code' in error
	const hasStack = isObject && 'stack' in error
	const hasMessage = isObject && 'message' in error
	return [hasCode, hasStack, hasMessage].filter(Boolean).length >= 2
}

export interface ErrorLike extends Error {
	code: string
}

function assert<T>(op: T | (() => T), message?: string, ...args: unknown[]): void {
	const result = typeof op === 'function' ? (op as Function)() : op
	if (!result) throw new ResultAssert(message, ...args)
}

Object.assign(Result, { assert })

export class ResultAssert extends Error {
	public readonly code: string = 'RESULT_ASSERT'

	public constructor(message?: string, ...args: unknown[]) {
		super(message)
		Object.assign(this, ...args)
		Error.captureStackTrace(this, ResultAssert)
	}
}

declare module '@sapphire/result' {
	namespace Result {
		function assert<T>(op: T | (() => T), message?: string, ...args: unknown[]): void
	}
}
