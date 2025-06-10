import { Option, Result } from '@sapphire/result'
import { isError, isFunction, isObjectLike } from 'es-toolkit/compat'

export { Option, Result }

export function isErrorLike<T>(error: unknown): error is Error & { code: string } & T {
  if (isError(error)) {
    return true
  } else if (!isObjectLike(error)) {
    return false
  }

  const hasCode = 'code' in error
  const hasStack = 'stack' in error
  const hasMessage = 'message' in error
  return hasMessage && (hasStack || hasCode)
}

function assert<T>(op: T | (() => T), message?: string, ...args: object[]): void | never {
  if (!(isFunction(op) ? op() : op)) {
    throw new ResultError(message, ...args)
  }
}

Object.assign(Result, { assert })

const STACK_TRACE_LIMIT: number = Error.stackTraceLimit

export class ResultError extends Error {
  public override name: string = 'ResultError'
  public code: string = 'RESULT_ERROR'

  public constructor(message?: string, ...args: object[]) {
    Error.stackTraceLimit = 0
    super(message)
    Error.stackTraceLimit = 1
    Error.captureStackTrace(this, Result.assert)
    Error.stackTraceLimit = STACK_TRACE_LIMIT
    Object.assign(this, ...args, {
      name: this.name,
      code: this.code,
      stack: this.stack,
    })
  }
}

declare module '@sapphire/result' {
  namespace Result {
    function assert<T>(op: T | (() => T), message?: string, ...args: object[]): void | never
  }
}
