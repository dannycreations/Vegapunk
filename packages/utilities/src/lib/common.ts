import { Awaitable } from '@sapphire/utilities'
import chalk from 'chalk'
import humanizeDuration from 'humanize-duration'
import { type ParseError, type ParseOptions, parse } from 'jsonc-parser'
import _ from 'lodash'

export { _, chalk, humanizeDuration }

export function parseJsonc<T>(text: string, errors?: ParseError[], options?: ParseOptions) {
	return parse(text, errors, options) as T
}

export async function sleepUntil(callback: SleepUntilCallback, delay: number = 10) {
	return new Promise<void>(async (resolve) => {
		let i = 1
		const waiting = async () => {
			if (await callback(resolve, i++)) resolve()
			else setTimeout(waiting, delay)
		}
		await waiting()
	})
}

export type SleepUntilCallback = (resolve: () => void, i: number) => Awaitable<boolean>
