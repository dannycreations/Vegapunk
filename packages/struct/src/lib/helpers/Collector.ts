import { EventEmitter } from 'node:events';
import { Result } from '@vegapunk/utilities/result';

/**
 * Defines the configuration for a data gathering operation.
 *
 * @template T The type of data to be gathered.
 */
export interface GatherOptions<T> {
  /** A predicate function to determine if an item should be collected. */
  readonly filter: (data: T) => boolean;

  /** The maximum number of items to collect. If 0, collects until timeout. */
  readonly max?: number;

  /** The maximum duration in milliseconds to wait for collections. */
  readonly timeout?: number;

  /**
   * An optional error message to use if the timeout is reached before the
   * `max` number of items is collected. If not provided, a timeout with
   * fewer than `max` items resolves successfully with the items collected so far.
   */
  readonly error?: string;
}

/**
 * An event-driven data collector that gathers items emitted through an
 * internal event emitter based on specified criteria.
 */
export class Collector {
  protected readonly id: symbol = Symbol(Collector.name);
  protected readonly emitter: EventEmitter = new EventEmitter();
  protected readonly gathers: Set<(reason: Error) => void> = new Set<(reason: Error) => void>();

  /**
   * Emits data to the internal event emitter, making it available for collection
   * by active `gather` operations.
   *
   * @example
   * ```typescript
   * const collector = new Collector();
   * // Emitting a piece of data on the default channel.
   * collector.inspect({ id: 1, value: 'data' });
   *
   * // Emitting data on a specific named channel.
   * collector.inspect({ id: 2, value: 'other data' }, 'custom-channel');
   * ```
   *
   * @template T The type of the data being inspected.
   * @param {T} data The data payload to emit.
   * @param {string | symbol=} [key=this.id] The event channel key to emit on.
   *   Defaults to the collector's internal unique symbol.
   * @returns {void}
   */
  public inspect<T>(data: T, key: string | symbol = this.id): void {
    this.emitter.emit(key, data);
  }

  /**
   * Asynchronously gathers data emitted by `inspect` that matches the provided
   * filter criteria, subject to a timeout and an optional maximum count.
   *
   * @example
   * ```typescript
   * import { Collector } from './collector';
   *
   * async function run() {
   *   const collector = new Collector();
   *
   *   const gatherPromise = collector.gather<{ value: number }>({
   *     filter: (data) => data.value > 10,
   *     max: 2,
   *     timeout: 1000,
   *   });
   *
   *   collector.inspect({ value: 5 });  // Filtered out
   *   collector.inspect({ value: 15 }); // Collected
   *   collector.inspect({ value: 25 }); // Collected, gather completes
   *
   *   const result = await gatherPromise;
   *   if (result.isOk()) {
   *     console.log('Collected:', result.unwrap()); // -> Collected: [{ value: 15 }, { value: 25 }]
   *   }
   * }
   *
   * run();
   * ```
   *
   * @template T The expected type of the data to be collected.
   * @param {GatherOptions<T>} options The criteria for the gathering operation.
   *   See {@link GatherOptions} for details.
   * @param {string | symbol=} [key=this.id] The event channel key to listen on.
   *   Must match the key used in `inspect`.
   * @returns {Promise<Result<T[], Error>>} A promise that resolves with a `Result`
   *   object. The `Result` contains an array of collected items on success, or
   *   an `Error` if the operation is disposed or times out with a configured
   *   error message.
   */
  public async gather<T>(options: GatherOptions<T>, key: string | symbol = this.id): Promise<Result<T[], Error>> {
    const { filter, max = 0, timeout = 60_000, error } = options;
    const collections: T[] = [];

    return new Promise((resolve) => {
      let timeoutId: NodeJS.Timeout;

      const endWithError = (reason: Error): void => {
        cleanup();
        resolve(Result.err(reason));
      };

      const cleanup = (): void => {
        clearTimeout(timeoutId);
        this.gathers.delete(endWithError);
        this.emitter.off(key, listener);
      };

      const listener = (data: T): void => {
        if (!filter(data)) {
          return;
        }

        collections.push(data);
        if (max > 0 && collections.length >= max) {
          cleanup();
          resolve(Result.ok(collections));
        }
      };

      timeoutId = setTimeout(() => {
        cleanup();
        if (max > 0 && collections.length < max && error) {
          resolve(Result.err(new Error(error)));
        } else {
          resolve(Result.ok(collections));
        }
      }, timeout);

      this.gathers.add(endWithError);
      this.emitter.on(key, listener);
    });
  }

  /**
   * Terminates all active `gather` operations and removes all event listeners,
   * effectively shutting down the collector.
   *
   * @example
   * ```typescript
   * const collector = new Collector();
   * // ... setup gathers and inspects
   * collector.dispose();
   * ```
   *
   * @returns {void}
   */
  public dispose(): void {
    const gathers = [...this.gathers.values()];
    this.gathers.clear();

    const disposeError = new Error('Collector disposed!');
    for (const endGather of gathers) {
      endGather(disposeError);
    }

    this.emitter.removeAllListeners();
  }
}
