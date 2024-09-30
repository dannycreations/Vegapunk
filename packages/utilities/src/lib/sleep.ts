import { Awaitable } from '@sapphire/utilities'

const MinSleepDelay = 10
const MaxSleepDelay = 2147483647

export async function sleepUntil(callback: SleepUntilCallback, options?: SleepUntilOptions) {
	let delay = typeof options?.delay === 'number' ? options.delay : MinSleepDelay
	delay = Math.min(Math.max(Math.trunc(delay), MinSleepDelay), MaxSleepDelay)
	return new Promise<void>(async (resolve) => {
		let i = 1
		const waiting = async () => {
			if (await callback(resolve, i++)) {
				resolve()
				return
			}

			const timer = setTimeout(waiting, delay)
			if (!options?.ref) timer.unref()
		}
		await waiting()
	})
}

export type SleepUntilCallback = (resolve: () => void, i: number) => Awaitable<boolean>
export interface SleepUntilOptions {
	readonly delay?: number
	readonly ref?: boolean
}
