import { Piece } from '@sapphire/pieces'
import { Result } from '@sapphire/result'
import { Events } from '../../types/Enum'
import { Task } from '../Task'

export class TaskBase<Options extends Task.Options> extends Piece<Options, 'tasks'> {
	public constructor(context: Task.LoaderContext, options: Options) {
		super(context, options)

		this._isEnable = typeof options.enabled === 'boolean' ? options.enabled : true
		this.setDelay(options.delay as number)
	}

	public awake?(): unknown
	public start?(): unknown
	public update?(): unknown

	public get isStatus() {
		return {
			idle: this._isIdle,
			enabled: this._isEnable,
			running: this._isRunning,
		}
	}

	public setDelay(delay: number) {
		delay = typeof delay === 'number' ? delay : Task.MinDelay
		this._delay = Math.min(Math.max(Math.trunc(delay), Task.MinDelay), Task.MaxDelay)
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
			if (!this._isAwakeOnce && typeof this.awake === 'function') {
				this._isAwakeOnce = true
				await this.awake()
			}
			if (this._isEnable) {
				if (!this._isStartOnce && typeof this.start === 'function') {
					this._isStartOnce = true
					await this.start()
				} else if (!init && typeof this.update === 'function') {
					await this.update()
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
		}, this._delay)

		if (!this.options.ref) {
			this._timeout.unref()
		}
	}

	private get _isDisable() {
		if (this._isRunning) return true
		if (!this._isEnable) true
		return false
	}

	private _isIdle = false
	private _isRunning = false
	private _isAwakeOnce = false
	private _isStartOnce = false

	private _isEnable: boolean
	private _delay = Task.MinDelay
	private _timeout?: NodeJS.Timeout
}
