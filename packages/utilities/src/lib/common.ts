import chalk from 'chalk'
import humanizeDuration from 'humanize-duration'
import { type ParseError, type ParseOptions, parse } from 'jsonc-parser'
import _ from 'lodash'

export { _, chalk, humanizeDuration }

export function parseJsonc<T>(text: string, errors?: ParseError[], options?: ParseOptions) {
	return parse(text, errors, options) as T
}

export async function sleepUntil(fun: Function, ms: number = 20) {
	return new Promise<boolean>((resolve) => {
		const wait = setInterval(() => {
			if (fun()) {
				clearInterval(wait)
				resolve(true)
			}
		}, ms)
	})
}
