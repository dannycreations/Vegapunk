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
    this.#clearTask()
    process.nextTick(async () => {
      if (force) await this.#start()

      this.#update()
    })
  }

  public stopTask(): void {
    this.enabled = false
    this.#clearTask()
  }

  async #start() {
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

  #update() {
    if (!this.enabled || this.#isRunning) return

    this.#timeout = setTimeout(() => {
      this.#clearTask()
      this.#start().then(() => this.#update())
    }, this.#delay)

    if (!this.options.ref) {
      this.#timeout.unref()
    }
  }

  #clearTask() {
    clearTimeout(this.#timeout)
    this.#timeout = undefined
  }

  #isRunning = false
  #isAwakeOnce = false
  #isStartOnce = false

  #delay = Task.MIN_DELAY
  #timeout?: NodeJS.Timeout
}

export interface TaskStatus {
  idle: boolean
  enabled: boolean
  running: boolean
}
