import { Option, Result } from '@sapphire/result'
import { isError, isObjectLike } from 'es-toolkit/compat'

export { Option, Result }

export function isErrorLike<T>(error: unknown): error is Error & { code: string } & T {
  if (isError(error)) return true

  const isObject = isObjectLike(error)
  const hasCode = isObject && 'code' in error
  const hasStack = isObject && 'stack' in error
  const hasMessage = isObject && 'message' in error
  return [hasCode, hasStack, hasMessage].filter(Boolean).length >= 2
}

function assert<T>(op: T | (() => T), message?: string, ...args: object[]): void {
  const result = typeof op === 'function' ? (op as Function)() : op
  if (!result) throw new ResultAssert(message, ...args)
}

Object.assign(Result, { assert })

const stackTraceLimit = Error.stackTraceLimit

export class ResultAssert extends Error {
  public override name: string = 'ResultAssert'

  public constructor(message?: string, ...args: object[]) {
    Error.stackTraceLimit = 0
    super(message)
    Error.stackTraceLimit = 1
    Error.captureStackTrace(this, assert)
    Error.stackTraceLimit = stackTraceLimit
    Object.assign(this, ...args, {
      name: this.name,
      code: 'RESULT_ASSERT',
      stack: this.stack,
    })
  }
}

declare module '@sapphire/result' {
  namespace Result {
    function assert<T>(op: T | (() => T), message?: string, ...args: object[]): void
  }
}
