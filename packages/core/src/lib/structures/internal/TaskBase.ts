import { Piece } from '@sapphire/pieces'
import { Result } from '@sapphire/result'
import { Events } from '../../types/Enum'
import { type Task } from '../Task'

export class TaskBase<Options extends Task.Options> extends Piece<Options, 'tasks'> {
	public get isStatus() {
		return {
			idle: this._isIdle,
			enabled: this._isEnable,
			running: this._isRunning,
		}
	}

	public setDelay(delay: number) {
		const maxDelay = 2147483647
		if (delay > maxDelay) delay = maxDelay

		this._delay = delay
	}

	public startTask(force?: boolean) {
		this._isEnable = true
		process.nextTick(() => this._update(force))
	}

	public stopTask() {
		this._isEnable = false
	}

	private async _start(init?: boolean) {
		this.container.logger.trace(`Task Run: ${this.options.name}`)
		this._isRunning = true

		const result = await Result.fromAsync(async () => {
			if (!this.#lockAwake && typeof this['awake'] === 'function') {
				this.#lockAwake = true
				await this['awake']()
			}
			if (this._isEnable) {
				if (!this.#lockStart && typeof this['start'] === 'function') {
					this.#lockStart = true
					await this['start']()
				} else if (!init && typeof this['update'] === 'function') {
					await this['update']()
				}
			}
		})
		result.inspectErr((error) => this.container.client.emit(Events.ListenerError, error, this))

		this._isRunning = false
		this.container.logger.trace(`Task End: ${this.options.name}`)
	}

	private async _update(force?: boolean) {
		clearTimeout(this._timeout)

		if (this._isDisable) return
		if (force) await this._start()

		this._isIdle = true
		this._timeout = setTimeout(() => {
			this._isIdle = false
			if (this._isDisable) return

			this._start().then(() => this._update())
		}, this._delay)
	}

	private get _isDisable() {
		if (this._isRunning) return true
		if (!this._isEnable) {
			this._timeout = undefined
			return true
		}
		return false
	}

	private _isIdle: boolean = false
	private _isEnable: boolean = true
	private _isRunning: boolean = false

	private _delay: number = 20
	private _timeout?: NodeJS.Timeout

	#lockAwake: boolean = false
	#lockStart: boolean = false
}
