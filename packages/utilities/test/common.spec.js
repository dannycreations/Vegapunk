const { sleepUntil } = require('../')

const { expect } = chai

describe('sleepUntil', () => {
	it('should handle an immediate resolution without any retries', async () => {
		let callCount = 0
		await sleepUntil(() => {
			callCount++
			return true
		})

		expect(callCount).to.equal(1)
	})

	it('should retry with delay until callback resolve', async () => {
		let callCount = 0
		await sleepUntil((resolve, i) => {
			callCount++
			if (i > 2) resolve()
		})

		expect(callCount).to.equal(3)
	})

	it('should use a custom delay if provided', async () => {
		let start = Date.now()
		await sleepUntil((_resolve, i) => {
			if (i > 2) return true
			setTimeout(() => {}, 25)
		}, 20)
		let end = Date.now()

		const totalElapsedTime = end - start
		expect(totalElapsedTime).to.be.at.least(40)
	})

	it('should waiting until status true', async () => {
		let status = false
		setTimeout(() => (status = true), 500)

		let start = Date.now()
		await sleepUntil(() => status)
		let end = Date.now()

		const totalElapsedTime = end - start
		expect(totalElapsedTime).to.be.at.least(500)
	})
})
