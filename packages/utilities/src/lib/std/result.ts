import { Result } from '@sapphire/result'

export * from '@sapphire/result'

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
