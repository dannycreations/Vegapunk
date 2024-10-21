import '../listeners/_load'

import { Piece, Store, StoreRegistry, container, getRootData } from '@sapphire/pieces'
import { Logger, logger } from '@vegapunk/logger'
import { EventEmitter } from 'node:events'
import { ListenerStore } from './structures/ListenerStore'
import { TaskStore } from './structures/TaskStore'

export class Vegapunk extends EventEmitter<ClientEvents> {
	public readonly stores: StoreRegistry
	public readonly options: Required<ClientOptions>

	public constructor(options: ClientOptions = {}) {
		super()

		this.options = {
			logger: logger({
				exception: false,
				rejection: false,
			}),
			baseUserDirectory: getRootData().root,
			internalError: true,
			internalException: true,
			internalRejection: true,
			...options,
		}

		container.client = this
		container.logger = this.options.logger

		if (this.options.logger.level === 'trace') {
			Store.logger = this.options.logger.trace.bind(this.options.logger)
		}

		this.stores = container.stores
		this.stores.register(new ListenerStore())
		this.stores.register(new TaskStore())

		process.on('uncaughtException', (...args) => container.client.emit('internalException', ...args))
		process.on('unhandledRejection', (...args) => container.client.emit('internalRejection', ...args))
	}

	public async start(): Promise<void> {
		if (this.options.baseUserDirectory !== null) {
			this.stores.registerPath(this.options.baseUserDirectory)
		}

		await Promise.all([...this.stores.values()].map((store) => store.loadAll()))
	}
}

export interface ClientOptions {
	logger?: Logger
	baseUserDirectory?: URL | string | null
	internalError?: boolean
	internalException?: boolean
	internalRejection?: boolean
}

export interface ClientEvents {
	internalError: [error: unknown, context: Piece]
	internalException: [error: Error, origin: string]
	internalRejection: [reason: unknown, promise: Promise<unknown>]
}

declare module '@sapphire/pieces' {
	interface Container {
		logger: Logger
		client: Vegapunk
	}

	interface StoreRegistryEntries {
		listeners: ListenerStore
		tasks: TaskStore
	}
}
