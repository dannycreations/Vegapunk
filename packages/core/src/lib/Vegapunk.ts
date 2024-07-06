import { Store, StoreRegistry, container } from '@sapphire/pieces'
import { Result } from '@sapphire/result'
import { Logger, logger } from '@vegapunk/logger'
import { EventEmitter } from 'node:events'
import { ListenerStore } from './structures/ListenerStore'
import { TaskStore } from './structures/TaskStore'

export class Vegapunk extends EventEmitter {
	public logger: Logger
	public stores: StoreRegistry

	public constructor() {
		super()
		container.client = this

		if (!container.logger) {
			container.logger = logger()
		}

		this.logger = container.logger
		if (this.logger.level === 'trace') {
			Store.logger = this.logger.trace.bind(this.logger)
		}

		this.stores = container.stores
		this.stores.register(new ListenerStore())
		this.stores.register(new TaskStore())
	}

	public async start() {
		const result = await Result.fromAsync(async () => {
			await Promise.all([...this.stores.values()].map((store) => store.loadAll()))
		})
		result.inspectErr((error) => this.logger.error(error))
	}
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
