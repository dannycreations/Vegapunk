import { ParseError, ParseOptions, parse } from 'jsonc-parser'

export function parseJsonc(text: string, errors?: ParseError[], options?: ParseOptions) {
	return parse(text, errors, options)
}
