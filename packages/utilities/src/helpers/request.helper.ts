import got, { CancelableRequest, Options, Response } from 'got'
import { sleep } from './sleep.helper'

export * from 'got'
export const request = got

export async function requestTimeout<T>(options: Options & TimeoutRequestOptions) {
	const { initialTimeout = 10 * 1000, transmissionTimeout = 30 * 1000, totalTimeout = 60 * 1000 } = options

	const instance = got({ retry: 0, ...options }) as CancelableRequest<Response<T>>

	const cancel = () => instance.cancel()
	const _totalTimeout = setTimeout(cancel, totalTimeout)
	let _initialTimeout = setTimeout(cancel, initialTimeout)

	instance.on('downloadProgress', () => {
		clearTimeout(_initialTimeout)
		_initialTimeout = setTimeout(cancel, transmissionTimeout)
	})

	try {
		return await instance
	} finally {
		clearTimeout(_totalTimeout)
		clearTimeout(_initialTimeout)
	}
}

export function waitForConnection(options: Options & TimeoutRequestOptions = {}) {
	return new Promise<boolean>((resolve) => {
		const { totalTimeout = 10 * 1000 } = options

		const wait = async () => {
			try {
				const res = await requestTimeout({
					url: 'https://google.com',
					totalTimeout,
					...options,
				})
				if (res.statusCode === 200) {
					return resolve(true)
				}
			} catch {
				await sleep(totalTimeout)
			}

			return wait()
		}

		return wait()
	})
}

interface TimeoutRequestOptions {
	initialTimeout?: number
	transmissionTimeout?: number
	totalTimeout?: number
}
