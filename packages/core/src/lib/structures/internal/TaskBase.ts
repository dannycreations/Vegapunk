import { Piece } from '@sapphire/pieces'
import { Result } from '@sapphire/result'
import { Events } from '../../types/Enum'
import { type Task } from '../Task'

const MinTaskDelay = 20
const MaxTaskDelay = 2147483647

export class TaskBase<Options extends Task.Options> extends Piece<Options, 'tasks'> {
	public constructor(context: Task.LoaderContext, options: Options) {
		super(context, options)

		this._isIdle = false
		this._isRunning = false
		this._lockAwake = false
		this._lockStart = false
		this._isEnable = typeof options.enabled === 'boolean' ? options.enabled : true
		this.setDelay(options.delay)
	}

	public get isStatus() {
		return {
			idle: this._isIdle,
			enabled: this._isEnable,
			running: this._isRunning,
		}
	}

	public setDelay(delay: number) {
		delay = typeof delay === 'number' ? delay : MinTaskDelay
		this._delay = Math.min(Math.max(Math.trunc(delay), MinTaskDelay), MaxTaskDelay)
	}

	public startTask(force?: boolean) {
		this._isEnable = true
		clearTimeout(this._timeout)
		process.nextTick(() => this._update(force))
	}

	public stopTask() {
		this._isEnable = false
		clearTimeout(this._timeout)
	}

	private async _start(init?: boolean) {
		this.container.logger.trace(`Task Run: ${this.name}`)
		this._isRunning = true

		const result = await Result.fromAsync(async () => {
			if (!this._lockAwake && typeof this['awake'] === 'function') {
				this._lockAwake = true
				await this['awake']()
			}
			if (this._isEnable) {
				if (!this._lockStart && typeof this['start'] === 'function') {
					this._lockStart = true
					await this['start']()
				} else if (!init && typeof this['update'] === 'function') {
					await this['update']()
				}
			}
		})
		result.inspectErr((error) => this.container.client.emit(Events.ListenerError, error, this))

		this._isRunning = false
		this.container.logger.trace(`Task End: ${this.name}`)
	}

	private async _update(force?: boolean) {
		if (this._isDisable) return
		if (force) await this._start()

		this._isIdle = true
		this._timeout = setTimeout(() => {
			this._isIdle = false
			if (this._isDisable) return

			this._timeout = undefined
			this._start().then(() => this._update())
		}, this._delay).unref()
	}

	private get _isDisable() {
		if (this._isRunning) return true
		if (!this._isEnable) true
		return false
	}

	private _delay: number
	private _isIdle: boolean
	private _isEnable: boolean
	private _isRunning: boolean
	private _lockAwake: boolean
	private _lockStart: boolean
	private _timeout: NodeJS.Timeout
}
