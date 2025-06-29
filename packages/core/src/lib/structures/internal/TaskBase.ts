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
      idle: !!this.#timeout,
      enabled: this.enabled,
      running: this.#isRunning,
    }
  }

  public setDelay(delay: number = Task.MIN_DELAY): void {
    this.#delay = Math.min(Math.max(Math.trunc(delay), Task.MIN_DELAY), Task.MAX_DELAY)
  }

  public startTask(force?: boolean): void {
    this.enabled = true
    this.#clear()
    process.nextTick(async () => {
      if (force) {
        await this.#start()
      }

      this.#update()
    })
  }

  public stopTask(): void {
    this.enabled = false
    this.#clear()
  }

  async #start(): Promise<void> {
    this.container.logger.trace(`Task Run: ${this.name}`)
    this.#isRunning = true

    const result = await Result.fromAsync(async () => {
      if (!this.#isAwakeOnce) {
        this.#isAwakeOnce = true
        await this.awake?.()
      }

      if (this.enabled) {
        if (!this.#isStartOnce) {
          this.#isStartOnce = true
          await this.start?.()
        } else {
          await this.update!()
        }
      }
    })
    result.inspectErr((error) => this.container.client.emit('internalError', error, this))

    this.#isRunning = false
    this.container.logger.trace(`Task End: ${this.name}`)
  }

  #clear(): void {
    clearTimeout(this.#timeout)
    this.#timeout = undefined
  }

  #update(): void {
    this.#clear()
    if (!this.enabled || this.#isRunning) {
      return
    }

    this.#timeout = setTimeout(() => {
      this.#clear()
      this.#start().finally(() => this.#update())
    }, this.#delay)

    if (this.options.ref === false) {
      this.#timeout.unref()
    }
  }

  #isRunning: boolean = false
  #isAwakeOnce: boolean = false
  #isStartOnce: boolean = false

  #delay: number = Task.MIN_DELAY
  #timeout?: NodeJS.Timeout
}

export interface TaskStatus {
  idle: boolean
  enabled: boolean
  running: boolean
}
