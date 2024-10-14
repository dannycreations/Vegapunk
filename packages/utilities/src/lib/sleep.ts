import { Awaitable } from './types'

// https://github.com/sapphiredev/utilities/blob/main/packages/utilities/src/lib/sleep.ts
export function sleep<T = undefined>(ms: number, value?: T, options: SleepOptions = {}) {
	return new Promise<T>((resolve, reject) => {
		const { signal = null, ref = false } = options
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

		const timer = setTimeout(() => resolve(value!), ms)
		if (!ref) timer.unref()
	})
}

export interface SleepOptions {
	signal?: AbortSignal
	ref?: boolean
}

export async function sleepUntil(fn: SleepUntilCallback, options: SleepUntilOptions = {}) {
	return new Promise<void>((resolve) => {
		let i = 0
		let done = false
		let timer: NodeJS.Timeout
		const { delay = 10, ref = false } = options
		const cancel = () => ((done = true), clearTimeout(timer))
		const waiting = async () => {
			if (await fn(cancel, i++)) cancel()
			if (done) return resolve()
			if (delay <= 0) {
				process.nextTick(waiting)
			} else {
				timer = setTimeout(waiting, delay)
				if (!ref) timer.unref()
			}
		}
		return waiting()
	})
}

export async function sleepFor(val: number, fn: (val: number) => Awaitable<boolean | void>) {
	return sleepUntil((resolve, i) => (i < val ? fn(i) : resolve()), { delay: 0 })
}

export async function sleepForOf<T>(val: T[], fn: (val: T, i: number) => Awaitable<boolean | void>) {
	return sleepUntil((resolve, i) => (i < val.length ? fn(val[i], i) : resolve()), { delay: 0 })
}

export interface SleepUntilOptions {
	delay?: number
	ref?: boolean
}

export type SleepUntilCallback = (resolve: () => void, i: number) => Awaitable<boolean | void>
