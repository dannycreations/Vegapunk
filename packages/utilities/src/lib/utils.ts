import chalk from 'chalk'
import { parse, type ParseError, type ParseOptions } from 'jsonc-parser'

export { chalk }

export function parseJsonc<T>(text: string, errors?: ParseError[], options?: ParseOptions): T {
	return parse(text, errors, options)
}

// https://github.com/sapphiredev/utilities/blob/main/packages/utilities/src/lib/lazy.ts
export function lazy<T>(cb: () => T): () => T {
	let defaultValue: T
	return () => (defaultValue ??= cb())
}
