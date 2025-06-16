/**
 * Provides a mutual exclusion mechanism to control access to shared resources.
 * It allows ensuring that only one operation can access a particular resource
 * at any given time, preventing race conditions. Locks can be acquired
 * synchronously (with {@link Mutex.lock}) or asynchronously (with {@link Mutex.acquire}).
 * Requests can be prioritized, and locks can have an automatic release timeout.
 */
export class Mutex {
  protected readonly id: symbol = Symbol(Mutex.name)
  protected readonly locks: Map<string | symbol, MutexEntry> = new Map()
  protected readonly queues: Map<string | symbol, MutexItem[]> = new Map()

  /**
   * Attempts to acquire a lock synchronously.
   * If the lock is already held for the given key or there are pending requests in its queue,
   * this method returns `true` (indicating the lock is busy). Otherwise, it acquires the
   * lock and returns `false`.
   * An optional timeout can be specified to automatically release the lock.
   *
   * @example
   * const mutex = new Mutex();
   * const resourceKey = 'myResource';
   *
   * if (!mutex.lock(resourceKey)) {
   *   console.log('Lock acquired for myResource');
   *   // Critical section: operations on the resource
   *   mutex.release(resourceKey);
   * } else {
   *   console.log('myResource is currently locked by another process.');
   * }
   *
   * // Lock with a 5-second timeout
   * if (!mutex.lock('timedResource', 5000)) {
   *   console.log('timedResource lock acquired, will auto-release in 5s.');
   *   // If not manually released, it will be released after 5 seconds.
   * }
   *
   * @param {string | symbol=} [key] The identifier for the resource to lock.
   *   Defaults to an internal unique ID for this {@link Mutex} instance if not provided.
   * @param {number=} [timeout] The duration in milliseconds after which the lock is
   *   automatically released. If not specified, the lock must be released manually.
   * @returns {boolean} `true` if the lock is already held or queued for the specified key,
   *   `false` if the lock was successfully acquired by this call.
   */
  public lock(key: string | symbol = this.id, timeout?: number): boolean {
    if (this.locks.has(key)) return true

    const keyQueue = this.queues.get(key)
    if (keyQueue && keyQueue.length > 0) return true

    const lockEntry: MutexEntry = {}
    if (typeof timeout === 'number') {
      lockEntry.timeoutId = setTimeout(() => {
        this.release(key)
      }, timeout)
    }
    this.locks.set(key, lockEntry)
    return false
  }

  /**
   * Asynchronously acquires a lock for the specified key.
   * If the lock is currently held, the request is queued. Requests are processed
   * based on priority (higher values first) and then by the time of request (earlier first).
   * The returned promise resolves when the lock is acquired.
   * An optional timeout can be specified to automatically release the lock after it's acquired.
   *
   * @example
   * const mutex = new Mutex();
   * const resourceKey = 'sharedResource';
   *
   * async function criticalTask(taskId: string, taskPriority: number) {
   *   console.log(`Task ${taskId} (priority ${taskPriority}) attempting to acquire lock...`);
   *   await mutex.acquire(resourceKey, taskPriority);
   *   console.log(`Task ${taskId} acquired lock.`);
   *   try {
   *     // Simulate work
   *     await new Promise(resolve => setTimeout(resolve, 500));
   *     console.log(`Task ${taskId} completed work.`);
   *   } finally {
   *     mutex.release(resourceKey);
   *     console.log(`Task ${taskId} released lock.`);
   *   }
   * }
   *
   * criticalTask('A', 0);
   * criticalTask('B', 1); // Higher priority, likely to acquire lock first if 'A' is queued.
   * criticalTask('C', 0);
   *
   * // Example with timeout
   * async function timedCriticalTask(taskId: string) {
   *   try {
   *     console.log(`Task ${taskId} attempting to acquire lock with 2s auto-release...`);
   *     await mutex.acquire('timedResource', 0, 2000);
   *     console.log(`Task ${taskId} acquired timedResource lock.`);
   *     // Work that might take longer than timeout
   *     await new Promise(resolve => setTimeout(resolve, 3000));
   *     console.log(`Task ${taskId} finished work (lock might have auto-released).`);
   *   } catch (error) {
   *     console.error(`Task ${taskId} error:`, error);
   *   } finally {
   *     // Attempt to release, safe even if auto-released.
   *     mutex.release('timedResource');
   *   }
   * }
   * timedCriticalTask('T1');
   *
   * @param {string | symbol=} [key] The identifier for the resource to lock.
   *   Defaults to an internal unique ID for this {@link Mutex} instance if not provided.
   * @param {number=} [priority=0] The priority of the lock request. Higher numbers indicate greater priority.
   * @param {number=} [timeout] The duration in milliseconds after which the lock is automatically released,
   *   after being acquired.
   * @returns {Promise<void>} A promise that resolves when the lock has been successfully acquired.
   * @throws {Error} If the {@link Mutex} is disposed while this acquisition request is pending.
   */
  public async acquire(key: string | symbol = this.id, priority: number = 0, timeout?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const attempt = (): void => {
        const lockEntry: MutexEntry = {}
        if (typeof timeout === 'number') {
          lockEntry.timeoutId = setTimeout(() => {
            this.release(key)
          }, timeout)
        }
        this.locks.set(key, lockEntry)
        resolve()
      }

      const keyQueue = this.queues.get(key)
      if (this.locks.has(key) || (keyQueue && keyQueue.length > 0)) {
        let queue = keyQueue
        if (!queue) {
          queue = []
          this.queues.set(key, queue)
        }

        queue.push({ attempt, reject, priority, timestamp: Date.now() })
        queue.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp)
      } else {
        attempt()
      }
    })
  }

  /**
   * Releases a previously acquired lock for the specified key.
   * If there are pending requests in the queue for this key, the highest priority
   * (and then oldest) request from the queue is granted the lock.
   * If no lock is held for the key, this method does nothing.
   *
   * @example
   * const mutex = new Mutex();
   * const resourceKey = 'myResource';
   *
   * async function useResource() {
   *   await mutex.acquire(resourceKey);
   *   console.log('Resource acquired.');
   *   // ... perform operations on the resource ...
   *   console.log('Operations complete, releasing resource.');
   *   mutex.release(resourceKey);
   * }
   * useResource();
   *
   * @param {string | symbol=} [key] The identifier for the resource to release.
   *   Defaults to an internal unique ID for this {@link Mutex} instance if not provided.
   * @returns {void}
   */
  public release(key: string | symbol = this.id): void {
    const currentLock = this.locks.get(key)
    if (!currentLock) return

    clearTimeout(currentLock.timeoutId)
    this.locks.delete(key)

    const keyQueue = this.queues.get(key)
    if (keyQueue && keyQueue.length > 0) {
      keyQueue.shift()!.attempt()
      if (keyQueue.length === 0) {
        this.queues.delete(key)
      }
    }
  }

  /**
   * Disposes of the mutex, releasing all active locks and rejecting all pending
   * lock acquisition requests.
   * After disposal, the mutex should not be used further. Any pending promises
   * from {@link Mutex#acquire} calls will be rejected with an error.
   *
   * @example
   * const mutex = new Mutex();
   *
   * mutex.lock('permanentLock', 60000); // Lock for 1 minute
   *
   * const p1 = mutex.acquire('resourceX', 0, 5000)
   *   .then(() => console.log('resourceX acquired (should not happen if disposed)'))
   *   .catch(err => console.error('resourceX acquisition failed:', err.message));
   *
   * const p2 = mutex.acquire('resourceY')
   *   .then(() => console.log('resourceY acquired (should not happen if disposed)'))
   *   .catch(err => console.error('resourceY acquisition failed:', err.message));
   *
   * // Simulate a short delay before disposing
   * setTimeout(() => {
   *   mutex.dispose();
   *   console.log('Mutex has been disposed.');
   *   // p1 and p2 promises should be rejected.
   * }, 100);
   *
   * // Expected output might include:
   * // resourceX acquisition failed: Mutex disposed
   * // resourceY acquisition failed: Mutex disposed
   * // Mutex has been disposed.
   *
   * @returns {void}
   */
  public dispose(): void {
    this.locks.forEach((r) => clearTimeout(r.timeoutId))
    this.locks.clear()

    this.queues.forEach((r) => r.forEach((s) => s.reject(new Error('Mutex disposed'))))
    this.queues.clear()
  }
}

/**
 * Represents an entry for an active lock in the {@link Mutex}.
 */
export interface MutexEntry {
  /**
   * The timeout identifier for the lock, if a timeout is set.
   * This is used to automatically release the lock after a specified duration.
   */
  timeoutId?: NodeJS.Timeout
}

/**
 * Represents an item in the queue for a lock request in the {@link Mutex}.
 */
export interface MutexItem {
  /**
   * The function to execute to attempt acquiring the lock.
   * Calling this function will set the lock as active for the corresponding key.
   */
  readonly attempt: () => void
  /**
   * The function to call to reject the promise associated with the lock acquisition attempt.
   * @param {Error=} [reason] The reason for rejection.
   */
  readonly reject: (reason?: Error) => void
  /**
   * The priority of the lock request. Higher numbers indicate higher priority.
   * This is used to determine the order in which queued requests are processed.
   */
  readonly priority: number
  /**
   * The timestamp when the lock request was made.
   * This is used as a tie-breaker if multiple requests have the same priority.
   */
  readonly timestamp: number
}
