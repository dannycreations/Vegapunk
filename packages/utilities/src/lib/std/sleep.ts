import { type Awaitable } from '../types'

/**
 * Pauses the execution for a specified duration.
 * @link https://github.com/sapphiredev/utilities/blob/main/packages/utilities/src/lib/sleep.ts
 *
 * @example
 * async function example() {
 *   console.log('Start');
 *   await sleep(1000);
 *   console.log('End after 1 second');
 *
 *   const result = await sleep(500, 'done');
 *   console.log(result); // 'done'
 *
 *   try {
 *     const controller = new AbortController();
 *     setTimeout(() => controller.abort('Cancelled by timeout'), 200);
 *     await sleep(1000, undefined, { signal: controller.signal });
 *   } catch (e) {
 *     console.error(e); // 'Cancelled by timeout'
 *   }
 * }
 * example();
 *
 * @template T The type of the value to resolve with.
 * @param {number} ms The number of milliseconds to sleep.
 * @param {T=} value The value to resolve the promise with.
 * @param {SleepOptions=} options Configuration options for the sleep behavior.
 * @returns {Promise<T>} A promise that resolves with the given value after the specified duration.
 * @throws {unknown} With the `AbortSignal`'s reason if the provided signal is aborted.
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
 * Defines the options for the {@link sleep} function.
 */
export interface SleepOptions {
  /**
   * An AbortSignal to allow aborting the sleep.
   * If the signal is aborted, the promise returned by {@link sleep} will reject.
   */
  signal?: AbortSignal
  /**
   * If `false`, the timeout will not keep the Node.js event loop active.
   * This allows the program to exit if this is the only active timer.
   */
  ref?: boolean
}

/**
 * Waits until the provided asynchronous predicate function `fn` signals completion.
 * The predicate is repeatedly called with a `release` function and an iteration counter.
 *
 * @example
 * async function exampleWaitUntil() {
 *   let condition = false;
 *   setTimeout(() => { condition = true; }, 1000);
 *
 *   console.log('Waiting for condition...');
 *   await waitUntil(async (release, iteration) => {
 *     console.log(`Waiting, iteration: ${iteration}`);
 *     if (condition) {
 *       console.log('Condition met!');
 *       return true; // Signal completion
 *     }
 *     if (iteration >= 5) {
 *        console.log('Max iterations reached, releasing.');
 *        release(); // Signal completion
 *     }
 *     return false; // Continue waiting
 *   }, { delay: 200 });
 *   console.log('Done waiting.');
 * }
 * exampleWaitUntil();
 *
 * @param {(release: () => void, i: number) => Awaitable<boolean | void>} fn The predicate function.
 * It receives a `release` function to manually stop waiting and the current iteration count `i`.
 * To signal completion and stop waiting, the function should either return a truthy value (e.g. `true`)
 * or call the provided `release` function. Returning a falsy value (e.g., `false` or `void`) continues the waiting process.
 * @param {WaitUntilOptions=} options Configuration options for the waiting behavior.
 * @returns {Promise<void>} A promise that resolves when the predicate function signals completion.
 * @throws {unknown} If the predicate function `fn` throws an error.
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
 * Defines the options for the {@link waitUntil} function.
 */
export interface WaitUntilOptions {
  /**
   * The delay in milliseconds between invocations of the predicate function.
   * A non-positive value (e.g., 0 or less) results in scheduling with `process.nextTick`.
   */
  delay?: number
  /**
   * If `false` and `delay` is positive, the timeout will not keep the Node.js event loop active.
   * This allows the program to exit if this is the only active timer.
   */
  ref?: boolean
}

/**
 * Repeatedly calls a function `fn` for a specified number of iterations, or until `fn` signals completion.
 * This function utilizes `waitUntil` with a fixed number of iterations and zero delay between them.
 *
 * @example
 * async function exampleWaitForIter() {
 *   console.log('Starting iterations...');
 *   await waitForIter(5, async (iteration, release) => {
 *     console.log(`Iteration: ${iteration}`);
 *     if (iteration === 3) {
 *       console.log('Releasing early at iteration 3');
 *       release(); // Signal completion
 *       return;    // Or return true
 *     }
 *     // Return false or void to continue
 *   });
 *   console.log('Iterations finished or released.');
 * }
 * exampleWaitForIter();
 *
 * @param {number} val The maximum number of iterations (exclusive). The iteration index `i` will range from `0` to `val - 1`.
 * @param {(iteration: number, release: () => void) => Awaitable<boolean | void>} fn The function to execute for each iteration.
 * It receives the current iteration index and a `release` function.
 * To stop early, the function should return a truthy value or call `release`.
 * @returns {Promise<void>} A promise that resolves when all iterations are complete or `fn` signals early completion.
 * @throws {unknown} If the function `fn` throws an error during execution.
 */
export async function waitForIter(val: number, fn: (val: number, release: () => void) => Awaitable<boolean | void>): Promise<void> {
  return waitUntil((release, i) => (i < val ? fn(i, release) : release()), { delay: 0 })
}

/**
 * Iterates over an array, calling an asynchronous function `fn` for each element
 * until the end of the array is reached or `fn` signals completion.
 * This function utilizes `waitUntil` to process array elements sequentially with zero delay.
 *
 * @example
 * async function exampleWaitForEach() {
 *   const items = ['apple', 'banana', 'cherry', 'date'];
 *   console.log('Processing items...');
 *   await waitForEach(items, async (item, index, release) => {
 *     console.log(`Processing item: "${item}" at index: ${index}`);
 *     if (item === 'cherry') {
 *       console.log('Found "cherry", stopping early.');
 *       release(); // Signal completion
 *       return;    // Or return true
 *     }
 *     // Return false or void to continue
 *   });
 *   console.log('Item processing finished or released.');
 * }
 * exampleWaitForEach();
 *
 * @template T The type of the elements in the array.
 * @param {T[]} val The array of items to iterate over.
 * @param {(item: T, index: number, release: () => void) => Awaitable<boolean | void>} fn The function to execute for each item.
 * It receives the current item, its index in the array, and a `release` function.
 * To stop early, the function should return a truthy value or call `release`.
 * @returns {Promise<void>} A promise that resolves when all items are processed or `fn` signals early completion.
 * @throws {unknown} If the function `fn` throws an error during execution.
 */
export async function waitForEach<T>(val: T[], fn: (val: T, i: number, release: () => void) => Awaitable<boolean | void>): Promise<void> {
  return waitUntil((release, i) => (i < val.length ? fn(val[i], i, release) : release()), { delay: 0 })
}
