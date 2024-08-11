import '../listeners/_load'

import { Store, StoreRegistry, container } from '@sapphire/pieces'
import { Logger, logger } from '@vegapunk/logger'
import { EventEmitter } from 'node:events'
import { ListenerStore } from './structures/ListenerStore'
import { TaskStore } from './structures/TaskStore'

export class Vegapunk extends EventEmitter {
	public logger: Logger
	public stores: StoreRegistry
	public options: ClientOptions

	public constructor(options: ClientOptions = {}) {
		super()
		container.client = this

		this.options = {
			errorCoreHandler: true,
			errorExceptionHandler: true,
			errorRejectionHandler: true,
			...options,
		}

		container.logger ??= logger({
			exceptionHandler: false,
			rejectionHandler: false,
		})

		this.logger = container.logger
		if (this.logger.level === 'trace') {
			Store.logger = this.logger.trace.bind(this.logger)
		}

		this.stores = container.stores
		this.stores.register(new ListenerStore())
		this.stores.register(new TaskStore())
	}

	public async start() {
		await Promise.all([...this.stores.values()].map((store) => store.loadAll()))
	}
}

export interface ClientOptions {
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
