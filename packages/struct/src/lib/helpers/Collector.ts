import { EventEmitter } from 'node:events'

/**
 * A class that collects and manages data emitted through an internal {@link EventEmitter}.
 * It allows for inspecting data (emitting it) and gathering data based on specified criteria
 * such as filtering, maximum count, and timeout.
 */
export class Collector {
  /**
   * Emits data through the internal event emitter on a specified or default key.
   * This method is used to provide data that can be potentially collected by one or more
   * active {@link Collector.gather} operations listening on the same key.
   *
   * @example
   * const collector = new Collector();
   *
   * // Inspect a string with a custom key
   * collector.inspect<string>('Hello, world!', 'customEvent');
   *
   * // Inspect a number using the default collector ID as key
   * collector.inspect<number>(123);
   *
   * @template T The type of data to inspect.
   * @param {T} data The data to be emitted.
   * @param {(string | symbol)=} [key=this.id] The event key to emit the data on. If not provided, `this.id` is used.
   * @returns {void}
   */
  public inspect<T>(data: T, key: string | symbol = this.id): void {
    this.emitter.emit(key, data)
  }

  /**
   * Gathers data items that match a filter, are emitted on a specific key,
   * and collects them until a maximum count is reached or a timeout occurs.
   *
   * @example
   * const collector = new Collector();
   *
   * async function collectNumbers() {
   *   // Start gathering numbers greater than 10, up to 2 items, or 1 second timeout
   *   const promise = collector.gather<number>({
   *     filter: (n) => n > 10,
   *     max: 2,
   *     timeout: 1000
   *   });
   *
   *   // Simulate data inspection
   *   collector.inspect(5);    // Ignored by filter
   *   collector.inspect(15);   // Collected
   *   setTimeout(() => collector.inspect(25), 100); // Collected
   *   collector.inspect(35);   // Ignored (max reached)
   *
   *   try {
   *     const collectedItems = await promise;
   *     console.log('Collected:', collectedItems); // Expected: [15, 25]
   *   } catch (error) {
   *     console.error('Collection error:', error);
   *   }
   * }
   * collectNumbers();
   *
   * // Example demonstrating timeout with custom error messages
   * async function collectWithTimeoutError() {
   *   try {
   *     await collector.gather<string>({
   *       filter: (s) => s.startsWith('a'),
   *       max: 1, // Max is > 0
   *       timeout: 500,
   *       errors: ['Timeout: No string starting with "a" received.']
   *     }, 'stringChannel');
   *   } catch (error) {
   *     console.error(error); // Expected: ['Timeout: No string starting with "a" received.']
   *   }
   * }
   * collectWithTimeoutError();
   *
   * @template T The type of data to be collected.
   * @param {GatherOptions<T>} options The options for gathering data, including `filter`, `max` count, `timeout`, and `errors`.
   *   See {@link GatherOptions}.
   * @param {(string | symbol)=} [key=this.id] The event key to listen for data on. If not provided, `this.id` is used.
   * @returns {Promise<T[]>} A promise that resolves with an array of collected items.
   * @throws {(string | string[] | Error)} The promise may reject with a reason string (e.g., internal disposal),
   *   an array of error strings (if `options.errors` is provided and timeout occurs under specific conditions),
   *   or an {@link Error} instance (e.g., if {@link Collector.dispose} is called globally).
   */
  public async gather<T>(options: GatherOptions<T>, key: string | symbol = this.id): Promise<T[]> {
    const { filter, max = 0, timeout = 60_000, errors } = options

    const collections: T[] = []
    return new Promise((resolve, reject) => {
      const cleanup = (): void => {
        clearTimeout(timeoutId)
        this.gathers.delete(dispose)
        this.emitter.off(key, listener)
      }

      const dispose = (reason: string): void => {
        cleanup()
        reject(reason)
      }

      const listener = (data: T): void => {
        if (!filter(data)) return

        collections.push(data)
        if (max <= 0 || collections.length < max) return

        cleanup()
        resolve(collections)
      }

      const timeoutId = setTimeout(() => {
        cleanup()
        max > 0 && errors ? reject(errors) : resolve(collections)
      }, timeout)

      this.gathers.add(dispose)
      this.emitter.on(key, listener)
    })
  }

  /**
   * Disposes of the collector, cleaning up all active gather operations and event listeners.
   * All pending promises returned by {@link Collector.gather} will be rejected with an error
   * indicating that the collector was disposed.
   *
   * @example
   * const collector = new Collector();
   * const promise = collector.gather<number>({
   *   filter: () => true,
   *   timeout: 5000
   * });
   *
   * promise.catch(error => {
   *   if (error instanceof Error && error.message === 'Collector disposed') {
   *     console.log('Gather operation was cancelled due to collector disposal.');
   *   }
   * });
   *
   * // Sometime later, before the promise resolves or rejects naturally:
   * collector.dispose();
   *
   * @returns {void}
   */
  public dispose(): void {
    const gathers = [...this.gathers.values()]
    this.gathers.clear()

    gathers.forEach((reject) => reject(new Error('Collector disposed')))
    this.emitter.removeAllListeners()
  }

  protected readonly id: symbol = Symbol(Collector.name)
  protected readonly emitter: EventEmitter = new EventEmitter()
  protected readonly gathers: Set<Function> = new Set<Function>()
}

/**
 * Defines the options for the {@link Collector.gather} method.
 * @template T The type of data to be collected.
 */
export interface GatherOptions<T> {
  /**
   * A function to filter the data. Only data for which this function returns true will be collected.
   */
  filter: (data: T) => boolean
  /**
   * The maximum number of items to collect.
   * If `undefined` or `0`, the collection is not limited by the number of items,
   * though it may still be limited by `timeout`. The default value if not specified is `0`.
   */
  max?: number
  /**
   * The maximum time in milliseconds to wait for data before the promise is settled.
   * If `undefined`, defaults to 60,000ms.
   */
  timeout?: number
  /**
   * An array of strings to be used as the rejection reason if the operation times out,
   * `max` is greater than 0, and the number of collected items is less than `max`.
   * If not provided under these timeout conditions, the promise resolves with the items collected so far.
   */
  errors?: string[]
}
