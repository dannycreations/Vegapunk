import chalk from 'chalk'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import humanizeDuration from 'humanize-duration'
import { type ParseError, type ParseOptions, parse } from 'jsonc-parser'

dayjs.extend(utc)
dayjs.extend(timezone)

export { chalk, dayjs, humanizeDuration }

export function parseJsonc<T>(text: string, errors?: ParseError[], options?: ParseOptions) {
	return parse(text, errors, options) as T
}
