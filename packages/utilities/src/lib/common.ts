import chalk from 'chalk'
import { type ParseError, type ParseOptions, parse } from 'jsonc-parser'

export { chalk }

export function parseJsonc<T>(text: string, errors?: ParseError[], options?: ParseOptions): T {
	return parse(text, errors, options)
}
