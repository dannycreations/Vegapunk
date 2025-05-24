import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'

/**
 * A generic class that collects data items of type `T` based on specified filtering criteria
 * and time/count limits. It extends {@link EventEmitter} to allow consumers to react to
 * inspected data. Each collector instance uses a unique ID for its events.
 *
 * @template T The type of data items to be collected.
 */
export class Collector<T> extends EventEmitter {
  /**
   * Creates an instance of the Collector.
   *
   * @param {string=} id The unique identifier for this collector instance.
   *   If not provided, a random UUID will be generated.
   */
  public constructor(id?: string) {
    super()

    this.#id = id || randomUUID()
    this.#length = 0
  }

  /**
   * Gets the unique identifier of the collector instance.
   *
   * @returns {string} The unique identifier.
   */
  public get id(): string {
    return this.#id
  }

  /**
   * Gets the current number of active `gather` operations (listeners) on this collector.
   *
   * @returns {number} The number of active listeners.
   */
  public get length(): number {
    return this.#length
  }

  /**
   * Inspects a new data item. If there are active `gather` operations (listeners),
   * this method emits an event using the collector's unique ID as the event name,
   * passing the data item to the listeners.
   *
   * @example
   * const stringCollector = new Collector<string>();
   * // Assume a gather() operation is active for stringCollector.id
   * stringCollector.inspect("new data item");
   *
   * @param {T} data The data item of type `T` to be inspected and potentially collected.
   * @returns {void}
   */
  public inspect(data: T): void {
    if (this.#length === 0) return
    super.emit(this.#id, data)
  }

  /**
   * Gathers data items of type `T` that match the provided filter criteria.
   * The gathering stops when the `max` number of items is collected, or when the `time` limit is reached.
   * Each call to `gather` sets up a new listener for data passed to `inspect`.
   *
   * @example
   * const numberCollector = new Collector<number>();
   *
   * async function collectEvenNumbers() {
   *   try {
   *     const numbers = await numberCollector.gather({
   *       filter: (n) => n % 2 === 0,
   *       max: 3,
   *       time: 5000, // 5 seconds
   *       errors: ["Timeout: Failed to collect 3 even numbers within 5 seconds."]
   *     });
   *     console.log("Collected even numbers:", numbers); // e.g., [2, 4, 6]
   *   } catch (e) {
   *     console.error(e); // e.g., ["Timeout: Failed to collect 3 even numbers within 5 seconds."]
   *   }
   * }
   *
   * collectEvenNumbers();
   *
   * // Simulate inspecting data, which will be processed by the active gather operation
   * setTimeout(() => numberCollector.inspect(1), 100);
   * setTimeout(() => numberCollector.inspect(2), 200); // Collected
   * setTimeout(() => numberCollector.inspect(3), 300);
   * setTimeout(() => numberCollector.inspect(4), 400); // Collected
   * setTimeout(() => numberCollector.inspect(5), 500);
   * setTimeout(() => numberCollector.inspect(6), 600); // Collected, gather resolves
   *
   * @param {FilterOptions<T>} options The options to configure the data gathering process.
   *   - `options.filter`: A function that takes a data item of type `T` and returns `true` if it should be collected, `false` otherwise.
   *   - `options.max`: The maximum number of items to collect. If 0 or not provided, collects items until the `time` limit is reached (no count limit). Defaults to 0.
   *   - `options.time`: The maximum time in milliseconds to wait for data collection. Defaults to 60,000 ms (60 seconds).
   *   - `options.errors`: An array of error messages (typically a single string in an array). If provided, and `max` is greater than 0, and the operation times out before `max` items are collected, the promise will be rejected with these errors.
   * @returns {Promise<T[]>} A promise that resolves with an array of collected items of type `T`.
   *   If `options.errors` is provided and the conditions for rejection are met (timeout before `max` items collected when `max` > 0), the promise is rejected.
   * @throws {string[]} Rejects with `options.errors` if `options.errors` is provided, `options.max` is greater than 0,
   *   and the collection times out before `options.max` items are collected.
   */
  public async gather(options: FilterOptions<T>): Promise<T[]> {
    const { filter, max = 0, time = 60_000, errors } = options

    const collections: T[] = []
    return new Promise((resolve, reject) => {
      const listener = (data: T) => {
        if (!filter(data)) return

        collections.push(data)
        if (max <= 0 || collections.length < max) return

        cleanup()
        resolve(collections)
      }

      const cleanup = () => {
        clearTimeout(timeout)
        this.off(this.#id, listener)
        this.#length = Math.max(0, this.#length - 1)
      }

      const timeout = setTimeout(() => {
        cleanup()
        errors && max > 0 && collections.length < max ? reject(errors) : resolve(collections)
      }, time).unref()

      super.on(this.#id, listener)
      this.#length++
    })
  }

  #id: string
  #length: number
}

export interface FilterOptions<T> {
  filter: (data: T) => boolean
  max?: number
  time?: number
  errors?: string[]
}
