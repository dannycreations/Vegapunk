import { Piece } from '@sapphire/pieces'
import { Result } from '@vegapunk/utilities/result'
import { Task } from '../Task'

export class TaskBase<Options extends Task.Options> extends Piece<Options, 'tasks'> {
  public constructor(context: Task.LoaderContext, options: Options = {} as Options) {
    super(context, options)

    this.setDelay(options.delay)
  }

  public awake?(): unknown
  public start?(): unknown
  public update?(): unknown

  public get isStatus(): TaskStatus {
    return {
      idle: !!this._timeout,
      enabled: this.enabled,
      running: this._isRunning,
    }
  }

  public setDelay(delay: number = Task.MIN_DELAY): void {
    this._delay = Math.min(Math.max(Math.trunc(delay), Task.MIN_DELAY), Task.MAX_DELAY)
  }

  public startTask(force?: boolean): void {
    this.enabled = true
    clearTimeout(this._timeout)
    this._timeout = undefined
    process.nextTick(() => this.#update(force))
  }

  public stopTask(): void {
    this.enabled = false
    clearTimeout(this._timeout)
    this._timeout = undefined
  }

  async #start() {
    this.container.logger.trace(`Task Run: ${this.name}`)
    this._isRunning = true

    const result = await Result.fromAsync(async () => {
      if (!this._isAwakeOnce) {
        this._isAwakeOnce = true
        await this.awake?.()
      }

      if (this.enabled) {
        if (!this._isStartOnce) {
          this._isStartOnce = true
          await this.start?.()
        } else {
          await this.update!()
        }
      }
    })
    result.inspectErr((error) => this.container.client.emit('internalError', error, this))

    this._isRunning = false
    this.container.logger.trace(`Task End: ${this.name}`)
  }

  async #update(force?: boolean) {
    if (!this.enabled || this._isRunning) return
    if (force) await this.#start()

    this._timeout = setTimeout(() => {
      this._timeout = undefined
      this.#start().then(() => this.#update())
    }, this._delay)

    if (!this.options.ref) {
      this._timeout.unref()
    }
  }

  private _isRunning = false
  private _isAwakeOnce = false
  private _isStartOnce = false

  private _delay = Task.MIN_DELAY
  private _timeout?: NodeJS.Timeout
}

export interface TaskStatus {
  idle: boolean
  enabled: boolean
  running: boolean
}
