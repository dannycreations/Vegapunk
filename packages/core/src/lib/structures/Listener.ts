import { Piece } from '@sapphire/pieces'
import { Result } from '@vegapunk/utilities/result'
import EventEmitter from 'node:events'
import type { ClientEvents } from '../constants/types'

export abstract class Listener<
  E extends keyof ClientEvents | symbol = keyof ClientEvents,
  Options extends Listener.Options = Listener.Options,
> extends Piece<Options, 'listeners'> {
  public readonly emitter: EventEmitter | null
  public readonly event: keyof ClientEvents | symbol
  public readonly once: boolean

  public constructor(context: Listener.LoaderContext, options: Options = {} as Options) {
    super(context, options)

    this.emitter =
      typeof options.emitter === 'undefined'
        ? this.container.client
        : (typeof options.emitter === 'string'
            ? (Reflect.get(this.container.client, options.emitter) as EventEmitter)
            : (options.emitter as EventEmitter)) ?? null
    this.event = options.event ?? (this.name as keyof ClientEvents)
    this.once = options.once ?? false

    this._listener = this.emitter && this.event ? (this.once ? this._runOnce.bind(this) : this._run.bind(this)) : null

    // If there's no emitter or no listener, disable:
    if (this.emitter === null || this._listener === null) this.enabled = false
  }

  public abstract run(...args: E extends keyof ClientEvents ? ClientEvents[E] : unknown[]): unknown

  private async _run(...args: unknown[]) {
    this.container.logger.trace(`Listener Run: ${this.event.toString()}`)

    const result = await Result.fromAsync(() => this.run(...(args as E extends keyof ClientEvents ? ClientEvents[E] : unknown[])))
    result.inspectErr((error) => this.container.client.emit('internalError', error, this))

    this.container.logger.trace(`Listener End: ${this.event.toString()}`)
  }

  private async _runOnce(...args: unknown[]) {
    await this._run(...args)
    await this.unload()
  }

  private _listener: ((...args: any[]) => void) | null
}

export interface ListenerOptions extends Piece.Options {
  readonly emitter?: EventEmitter
  readonly event?: keyof ClientEvents | symbol
  readonly once?: boolean
}

export namespace Listener {
  export type Options = ListenerOptions
  export type LoaderContext = Piece.LoaderContext<'listeners'>
}
