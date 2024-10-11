import { Awaitable } from './types'

// https://github.com/sapphiredev/utilities/blob/main/packages/utilities/src/lib/sleep.ts
export function sleep<T = undefined>(ms: number, value?: T, options?: SleepOptions) {
	return new Promise<T>((resolve, reject) => {
		const signal = options?.signal
		if (signal) {
			if (signal.aborted) {
				reject(signal.reason)
				return
			}

			signal.addEventListener('abort', () => {
				clearTimeout(timer)
				reject(signal.reason)
			})
		}

		const timer: NodeJS.Timeout | number = setTimeout(() => resolve(value!), ms)
		if (options?.ref === false && typeof timer === 'object') timer.unref()
	})
}

const MinDelay = 10
const MaxDelay = 2147483647

export async function sleepUntil(callback: SleepUntilCallback, options?: SleepUntilOptions) {
	const delay = Math.min(Math.max(Math.trunc(options?.delay || MinDelay), MinDelay), MaxDelay)
	await new Promise<void>(async (resolve) => {
		let i = 0
		let done = false
		let timer: NodeJS.Timeout
		const cancel = () => ((done = true), clearTimeout(timer))
		const waiting = async () => {
			if (done) return resolve()
			if (await callback(cancel, i++)) cancel()
			if (done) return resolve()

			timer = setTimeout(waiting, delay)
			if (!options?.ref) timer.unref()
		}
		await waiting()
	})
}

export interface SleepOptions {
	signal?: AbortSignal | undefined
	ref?: boolean | undefined
}

export interface SleepUntilOptions {
	delay?: number
	ref?: boolean
}

export type SleepUntilCallback = (resolve: () => void, i: number) => Awaitable<boolean | void>
