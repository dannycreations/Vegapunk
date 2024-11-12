export class Mutex {
	public lock(timeout?: number): boolean {
		if (this.locked) return true

		this.locked = true
		this.timeout(timeout)
		return false
	}

	public async acquire(priority = 0, timeout?: number): Promise<void> {
		return new Promise((resolve) => {
			const attempt = () => {
				if (!this.locked) {
					this.locked = true
					this.timeout(timeout)
					return resolve()
				}

				const timestamp = Date.now()
				this.queue.push({ attempt, priority, timestamp })
				this.queue.sort((a, b) => {
					if (b.priority === a.priority) {
						return a.timestamp - b.timestamp
					}
					return b.priority - a.priority
				})
			}
			attempt()
		})
	}

	public release(): void {
		if (!this.locked) return

		this.locked = false

		if (this.lockTimeout) {
			clearTimeout(this.lockTimeout)
			this.lockTimeout = undefined
		}

		const queue = this.queue.shift()
		queue && queue.attempt()
	}

	protected timeout(timeout?: number): void {
		if (typeof timeout === 'number') {
			this.lockTimeout = setTimeout(() => {
				this.release()
			}, timeout)
		}
	}

	protected locked = false
	protected lockTimeout?: NodeJS.Timeout
	protected readonly queue: MutexQueue[] = []
}

export interface MutexQueue {
	priority: number
	timestamp: number
	attempt: () => void
}
