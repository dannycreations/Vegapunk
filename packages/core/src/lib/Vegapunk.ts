import '../listeners/_load';

import EventEmitter from 'node:events';
import { container, getRootData, Store } from '@sapphire/pieces';
import { logger } from '@vegapunk/logger';

import { ListenerStore } from './structures/ListenerStore';
import { TaskStore } from './structures/TaskStore';

import type { StoreRegistry } from '@sapphire/pieces';
import type { Logger } from '@vegapunk/logger';
import type { ClientEvents, ClientOptions } from './core/types';

export class Vegapunk extends EventEmitter<ClientEvents> {
  public readonly stores: StoreRegistry;
  public readonly options: Required<ClientOptions>;

  public constructor(options: ClientOptions = {}) {
    super();

    this.options = {
      logger: logger({
        exception: false,
        rejection: false,
      }),
      baseDirectory: getRootData().root,
      internalError: true,
      internalException: true,
      internalRejection: true,
      ...options,
    };

    Object.assign(container, {
      client: this,
      logger: this.options.logger,
    });

    if (this.options.logger.level === 'trace') {
      Store.logger = this.options.logger.trace.bind(this.options.logger);
    }

    this.stores = container.stores;
    this.stores.register(new ListenerStore());
    this.stores.register(new TaskStore());

    process.on('uncaughtException', (...args) => {
      container.client.emit('internalException', ...args);
    });
    process.on('unhandledRejection', (...args) => {
      container.client.emit('internalRejection', ...args);
    });
  }

  public async start(): Promise<void> {
    if (this.options.baseDirectory !== null) {
      this.stores.registerPath(this.options.baseDirectory);
    }

    await Promise.all([...this.stores.values()].map((store) => store.loadAll()));
  }

  public async destroy(): Promise<void> {
    await Promise.all([...this.stores.values()].map((store) => store.unloadAll()));
  }
}

declare module '@sapphire/pieces' {
  interface Container {
    readonly logger: Logger;
    readonly client: Vegapunk;
  }

  interface StoreRegistryEntries {
    readonly listeners: ListenerStore;
    readonly tasks: TaskStore;
  }
}
