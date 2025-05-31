import { type Awaitable } from '../types'

/**
 * Pauses execution for a specified duration.
 * This promise can be optionally aborted using an AbortSignal.
 * @link https://github.com/sapphiredev/utilities/blob/main/packages/utilities/src/lib/sleep.ts
 *
 * @example
 * await sleep(1000); // Sleeps for 1 second
 *
 * const result = await sleep(500, 'hello'); // Sleeps for 500ms and resolves to 'hello'
 * console.log(result); // Output: hello
 *
 * const controller = new AbortController();
 * const sleepPromise = sleep(2000, 'wake up', { signal: controller.signal });
 * sleepPromise
 *   .then(value => console.log(`Slept successfully: ${value}`))
 *   .catch(reason => console.log(`Sleep aborted: ${reason.message || reason}`));
 * // To abort the sleep:
 * // setTimeout(() => controller.abort(new Error('Cancelled by timeout')), 1000);
 *
 * @template T The type of the value the promise will resolve to.
 * @param {number} ms The duration to sleep in milliseconds.
 * @param {T=} value An optional value to resolve the promise with.
 * @param {SleepOptions=} [options={}] Optional configuration for the sleep operation. See {@link SleepOptions}.
 * @returns {Promise<T>} A promise that resolves with the provided `value` (or `undefined` if no value is provided) after the specified duration,
 *   or rejects if an `AbortSignal` is triggered.
 * @throws {unknown} If the provided `AbortSignal` is aborted, the promise rejects with `signal.reason`.
 */
export function sleep<T>(ms: number, value?: T, options: SleepOptions = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const { signal = null, ref = false } = options
    if (signal) {
      if (signal.aborted) {
        reject(signal.reason)
        return
      }

      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          reject(signal.reason)
        },
        { once: true },
      )
    }

    const timer = setTimeout(() => resolve(value!), ms)
    if (!ref) timer.unref()
  })
}

/**
 * Options for the {@link sleep} function.
 */
export interface SleepOptions {
  /**
   * An optional `AbortSignal` that can be used to cancel the sleep operation.
   * If the signal is aborted, the `sleep` promise will reject.
   */
  signal?: AbortSignal
  /**
   * When `false` (default), the `setTimeout` timer used by `sleep` will not keep the Node.js event loop active.
   * Set to `true` to have the timer keep the event loop active.
   */
  ref?: boolean
}

/**
 * Waits until a provided predicate function returns `true` or invokes its `release` argument.
 * The predicate function is called repeatedly with a delay between calls.
 *
 * @example
 * let conditionMet = false;
 * setTimeout(() => { conditionMet = true; }, 1000);
 *
 * await waitUntil(async (release, iteration) => {
 *   console.log(`waitUntil check #${iteration}`);
 *   if (conditionMet) {
 *     console.log('Condition is now met!');
 *     return true; // or call release()
 *   }
 *   return false; // Continue waiting
 * }, { delay: 200, ref: true });
 * console.log('waitUntil finished.');
 *
 * // Example with manual release:
 * await waitUntil((release, i) => {
 *  if (i >= 3) {
 *    console.log('Releasing after 3 iterations.');
 *    release();
 *  } else {
 *    console.log(`Iteration ${i}, still waiting...`);
 *  }
 * }, { delay: 50 });
 *
 * @param {(release: () => void, i: number) => Awaitable<boolean | void>} fn A function that is called repeatedly.
 *   It receives a `release` function (call to stop waiting) and the current iteration count `i` (0-indexed).
 *   The function should return `true` (or a Promise resolving to `true`) or call `release()` to indicate completion.
 *   Returning `false`, `void`, or a Promise resolving to such values will continue the waiting.
 * @param {WaitUntilOptions=} [options={}] Optional configuration for the wait operation. See {@link WaitUntilOptions}.
 * @returns {Promise<void>} A promise that resolves when the predicate function signals completion (by returning `true` or calling `release`).
 * @throws {unknown} Rejects if the predicate function `fn` throws an error during its execution.
 */
export async function waitUntil(fn: (release: () => void, i: number) => Awaitable<boolean | void>, options: WaitUntilOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    let i = 0,
      done = false,
      timer: NodeJS.Timeout
    const { delay = 10, ref = false } = options
    const release = () => ((done = true), clearTimeout(timer))
    const waiting = async () => {
      try {
        if (await fn(release, i++)) release()
        if (done) resolve()
        else if (delay <= 0) {
          process.nextTick(waiting)
        } else {
          timer = setTimeout(waiting, delay)
          if (!ref) timer.unref()
        }
      } catch (error) {
        release(), reject(error)
      }
    }
    return waiting()
  })
}

/**
 * Options for the {@link waitUntil} function.
 */
export interface WaitUntilOptions {
  /**
   * The delay in milliseconds between calls to the predicate function.
   * If `delay` is less than or equal to `0`, `process.nextTick` is used for subsequent calls instead of `setTimeout`.
   * Defaults to `10`.
   */
  delay?: number
  /**
   * When `false` (default), the `setTimeout` timer (if `delay > 0`) used by `waitUntil` will not keep the Node.js event loop active.
   * Set to `true` to have the timer keep the event loop active. This has no effect if `delay <= 0`.
   */
  ref?: boolean
}

/**
 * Iterates a specified number of times, calling an asynchronous function for each iteration.
 * The process waits for the function to complete or signal early release before starting the next iteration or finishing.
 * This function is a specialized use case of {@link waitUntil} with `delay: 0`.
 *
 * @example
 * await waitForIter(3, async (iterationIndex, release) => {
 *   console.log(`Starting iteration ${iterationIndex}`);
 *   await sleep(100); // Simulate async work
 *   if (iterationIndex === 1) {
 *     console.log('Deciding to release early during iteration 1.');
 *     release(); // This will stop further iterations.
 *     // return true; // also works
 *   }
 *   console.log(`Finished iteration ${iterationIndex}`);
 *   // return false; // or return void to continue
 * });
 * // Output might be:
 * // Starting iteration 0
 * // Finished iteration 0
 * // Starting iteration 1
 * // Deciding to release early during iteration 1.
 *
 * @param {number} val The number of iterations to perform (exclusive, e.g., `val = 3` means iterations 0, 1, 2).
 * @param {(val: number, release: () => void) => Awaitable<boolean | void>} fn A function called for each iteration.
 *   It receives the current iteration index `val` (0-indexed) and a `release` function.
 *   Return `true` or call `release()` to stop iterations early. Return `false` or `void` to continue.
 * @returns {Promise<void>} A promise that resolves when all iterations are complete or `release` is called.
 * @throws {unknown} Rejects if the provided function `fn` throws an error during its execution.
 */
export async function waitForIter(val: number, fn: (val: number, release: () => void) => Awaitable<boolean | void>): Promise<void> {
  return waitUntil((release, i) => (i < val ? fn(i, release) : release()), { delay: 0 })
}

/**
 * Iterates over an array, calling an asynchronous function for each element.
 * The process waits for the function to complete or signal early release before processing the next element or finishing.
 * This function is a specialized use case of {@link waitUntil} with `delay: 0`.
 *
 * @example
 * const items = ['alpha', 'beta', 'gamma'];
 * await waitForEach(items, async (item, index, release) => {
 *   console.log(`Processing item: ${item} at index: ${index}`);
 *   await sleep(50); // Simulate async work for each item
 *   if (item === 'beta') {
 *     console.log('Found "beta", releasing early.');
 *     release(); // Stop processing further items
 *     // return true; // also works
 *   }
 *   // return false; // or return void to continue
 * });
 * // Output might be:
 * // Processing item: alpha at index: 0
 * // Processing item: beta at index: 1
 * // Found "beta", releasing early.
 *
 * @template T The type of elements in the input array.
 * @param {T[]} val The array of items to iterate over.
 * @param {(val: T, i: number, release: () => void) => Awaitable<boolean | void>} fn A function called for each item.
 *   It receives the current item `val`, its index `i`, and a `release` function.
 *   Return `true` or call `release()` to stop processing further items. Return `false` or `void` to continue.
 * @returns {Promise<void>} A promise that resolves when all items are processed or `release` is called.
 * @throws {unknown} Rejects if the provided function `fn` throws an error during its execution.
 */
export async function waitForEach<T>(val: T[], fn: (val: T, i: number, release: () => void) => Awaitable<boolean | void>): Promise<void> {
  return waitUntil((release, i) => (i < val.length ? fn(val[i], i, release) : release()), { delay: 0 })
}
