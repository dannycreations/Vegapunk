import _chalk from 'chalk'
import _humanizeDuration from 'humanize-duration'
import { ParseError, ParseOptions, parse } from 'jsonc-parser'
import _lodash from 'lodash'

export const chalk = _chalk
export const lodash = _lodash
export const humanizeDuration = _humanizeDuration

export function parseJsonc<T>(text: string, errors?: ParseError[], options?: ParseOptions) {
	return parse(text, errors, options) as T
}
