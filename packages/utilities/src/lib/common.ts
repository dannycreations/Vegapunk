import chalk from 'chalk'
import humanizeDuration from 'humanize-duration'
import { type ParseError, type ParseOptions, parse } from 'jsonc-parser'
import { tz } from 'moment-timezone'

export { chalk, humanizeDuration }

export function parseJsonc<T>(text: string, errors?: ParseError[], options?: ParseOptions) {
	return parse(text, errors, options) as T
}

export function getTimezoneDate(date: Date = new Date(), timezone?: string) {
	return tz(date, timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)
}
