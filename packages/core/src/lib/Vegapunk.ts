import '../listeners/_load'

import { Store, StoreRegistry, container, getRootData } from '@sapphire/pieces'
import { Logger, logger } from '@vegapunk/logger'
import { EventEmitter } from 'node:events'
import { ListenerStore } from './structures/ListenerStore'
import { TaskStore } from './structures/TaskStore'

export class Vegapunk extends EventEmitter {
	public stores: StoreRegistry
	public options: ClientOptions

	public constructor(options: ClientOptions = {}) {
		super()
		container.client = this

		this.options = {
			logger: logger({
				exceptionHandler: false,
				rejectionHandler: false,
			}),
			baseUserDirectory: getRootData().root,
			errorCoreHandler: true,
			errorExceptionHandler: true,
			errorRejectionHandler: true,
			...options,
		}

		container.logger = this.options.logger
		if (this.options.logger.level === 'trace') {
			Store.logger = this.options.logger.trace.bind(this.options.logger)
		}

		this.stores = container.stores
		this.stores.register(new ListenerStore())
		this.stores.register(new TaskStore())
	}

	public async start() {
		if (this.options.baseUserDirectory !== null) {
			this.stores.registerPath(this.options.baseUserDirectory)
		}

		await Promise.all([...this.stores.values()].map((store) => store.loadAll()))
	}
}

export interface ClientOptions {
	logger?: Logger
	baseUserDirectory?: URL | string | null
	errorCoreHandler?: boolean
	errorExceptionHandler?: boolean
	errorRejectionHandler?: boolean
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
