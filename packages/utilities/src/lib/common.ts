import { Awaitable } from '@sapphire/utilities'
import chalk from 'chalk'
import humanizeDuration from 'humanize-duration'
import { type ParseError, type ParseOptions, parse } from 'jsonc-parser'
import _ from 'lodash'

export { _, chalk, humanizeDuration }

export function parseJsonc<T>(text: string, errors?: ParseError[], options?: ParseOptions) {
	return parse(text, errors, options) as T
}

export async function sleepUntil(callback: () => Awaitable<boolean>) {
	return new Promise<void>((resolve) => {
		const waiting = () => {
			const timeout = setTimeout(async () => {
				clearTimeout(timeout)
				if (await callback()) resolve()
				else waiting()
			}, 10)
		}
		waiting()
	})
}
