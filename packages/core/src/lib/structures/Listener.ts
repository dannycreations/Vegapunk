import { Piece } from '@sapphire/pieces'
import { Result } from '@sapphire/result'
import { type EventEmitter } from 'node:events'
import { Events } from '../types/Enum'

export abstract class Listener<Options extends Listener.Options = Listener.Options> extends Piece<Options, 'listeners'> {
	public readonly emitter: EventEmitter | null
	public readonly event: string | symbol
	public readonly once: boolean

	public constructor(context: Listener.LoaderContext, options: Options = {} as Options) {
		super(context, options)

		this.emitter =
			typeof options.emitter === 'undefined'
				? this.container.client
				: (typeof options.emitter === 'string'
						? (Reflect.get(this.container.client, options.emitter) as EventEmitter)
						: (options.emitter as EventEmitter)) ?? null
		this.event = options.event ?? this.name
		this.once = options.once ?? false

		this._listener = this.emitter && this.event ? (this.once ? this._runOnce.bind(this) : this._run.bind(this)) : null

		// If there's no emitter or no listener, disable:
		if (this.emitter === null || this._listener === null) this.enabled = false
	}

	public abstract run(...args: unknown[]): unknown

	private async _run(...args: unknown[]) {
		this.container.logger.trace(`Listener Run: ${this.event.toString()}`)

		const result = await Result.fromAsync(() => this.run(...args))
		result.inspectErr((error) => this.container.client.emit(Events.ListenerError, error, this))

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
	readonly event?: string | symbol
	readonly once?: boolean
}

export namespace Listener {
	export type Options = ListenerOptions
	export type LoaderContext = Piece.LoaderContext<'listeners'>
}
