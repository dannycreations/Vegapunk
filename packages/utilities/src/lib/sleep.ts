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
