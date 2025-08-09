import { Queue } from '../heaps/Queue';

/**
 * Represents an entry for a held lock, which may include a timeout for auto-release.
 */
export interface MutexEntry {
  /**
   * The timeout identifier returned by `setTimeout` for auto-releasing the lock.
   */
  timeoutId?: NodeJS.Timeout;
}

/**
 * Represents an item waiting in the queue to acquire a lock.
 */
export interface MutexItem {
  /**
   * The function to execute to acquire the lock and resolve the promise.
   */
  readonly attempt: () => void;

  /**
   * The function to reject the promise if the mutex is disposed.
   */
  readonly reject: (reason?: Error) => void;

  /**
   * The priority of the acquisition request. Higher numbers have higher priority.
   */
  readonly priority: number;

  /**
   * The timestamp of when the request was made, used as a tie-breaker for priority.
   */
  readonly timestamp: number;
}

/**
 * Provides a mutual exclusion mechanism to control access to a shared resource
 * across asynchronous operations. It supports keyed locks, priority-based queuing,
 * and optional timeouts for automatic lock release.
 */
export class Mutex {
  protected readonly id: symbol = Symbol(Mutex.name);
  protected readonly locks: Map<string | symbol, MutexEntry> = new Map();
  protected readonly queues: Map<string | symbol, Queue<MutexItem>> = new Map();

  /**
   * Synchronously checks if a resource is locked and acquires the lock if it is not.
   * This method provides a non-blocking way to attempt to gain exclusive access.
   * If the lock is acquired, it must be manually released using {@link release}.
   *
   * @example
   * ```typescript
   * const mutex = new Mutex();
   * const resourceKey = 'my-resource';
   *
   * if (!mutex.lock(resourceKey, 5000)) {
   *   try {
   *     // Critical section: The lock was acquired successfully.
   *     // It will be auto-released after 5 seconds if not done manually.
   *   } finally {
   *     mutex.release(resourceKey); // It's best practice to release manually.
   *   }
   * } else {
   *   console.log('Resource is currently locked.');
   * }
   * ```
   *
   * @param {string | symbol=} [key=this.id] A unique key identifying the resource to lock.
   *   If not provided, a symbol unique to the `Mutex` instance is used.
   * @param {number=} timeout An optional duration in milliseconds after which the lock
   *   is automatically released.
   * @returns {boolean} `true` if the resource was already locked (or had pending requests),
   *   `false` if the lock was successfully acquired.
   */
  public lock(key: string | symbol = this.id, timeout?: number): boolean {
    const isLocked = this.locks.has(key);
    const queue = this.queues.get(key);
    const hasQueue = queue !== undefined && queue.size > 0;

    if (isLocked || hasQueue) {
      return true;
    }

    const lockEntry: MutexEntry = {};
    if (typeof timeout === 'number' && timeout >= 0) {
      lockEntry.timeoutId = setTimeout(() => {
        this.release(key);
      }, timeout);
    }
    this.locks.set(key, lockEntry);

    return false;
  }

  /**
   * Asynchronously acquires a lock, waiting in a priority queue if the resource is
   * currently locked. Once acquired, the lock must be released using {@link release}
   * to allow other contenders to proceed.
   *
   * @example
   * ```typescript
   * const mutex = new Mutex();
   * const resourceKey = 'database-connection';
   *
   * async function performTransaction(user: string, priority: number) {
   *   console.log(`${user} attempting to acquire lock with priority ${priority}...`);
   *   await mutex.acquire(resourceKey, priority);
   *   try {
   *     console.log(`${user} acquired the lock.`);
   *     // Simulate work in the critical section.
   *     await new Promise(resolve => setTimeout(resolve, 500));
   *   } finally {
   *     console.log(`${user} is releasing the lock.`);
   *     mutex.release(resourceKey);
   *   }
   * }
   *
   * // Higher priority task will likely run first, even if started second.
   * performTransaction('LowPriorityUser', 1);
   * performTransaction('HighPriorityUser', 10);
   * ```
   *
   * @param {string | symbol=} [key=this.id] A unique key identifying the resource to lock.
   *   If not provided, a symbol unique to the `Mutex` instance is used.
   * @param {number=} [priority=0] The priority of the acquisition request.
   *   Higher numbers are given precedence.
   * @param {number=} timeout An optional duration in milliseconds after which the
   *   acquired lock is automatically released.
   * @returns {Promise<void>} A promise that resolves when the lock has been successfully acquired.
   */
  public acquire(key: string | symbol = this.id, priority: number = 0, timeout?: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const queue = this.queues.get(key);
      const isLocked = this.locks.has(key);
      const hasQueue = queue !== undefined && queue.size > 0;

      const attempt = (): void => {
        const lockEntry: MutexEntry = {};
        if (typeof timeout === 'number' && timeout >= 0) {
          lockEntry.timeoutId = setTimeout(() => {
            this.release(key);
          }, timeout);
        }
        this.locks.set(key, lockEntry);
        resolve();
      };

      if (!isLocked && !hasQueue) {
        attempt();
      } else {
        let keyQueue = this.queues.get(key);
        if (keyQueue === undefined) {
          const comparator = (a: MutexItem, b: MutexItem): number => b.priority - a.priority || a.timestamp - b.timestamp;
          keyQueue = new Queue<MutexItem>(comparator);
          this.queues.set(key, keyQueue);
        }

        keyQueue.enqueue({
          attempt,
          reject,
          priority,
          timestamp: Date.now(),
        });
      }
    });
  }

  /**
   * Releases a lock, allowing the next queued contender (if any) to acquire it.
   * If a timeout was set on lock acquisition, this method cancels it.
   *
   * @example
   * ```typescript
   * const mutex = new Mutex();
   * const key = 'my-resource';
   *
   * async function doWork() {
   *   await mutex.acquire(key);
   *   try {
   *     // Critical section
   *   } finally {
   *     mutex.release(key);
   *   }
   * }
   *
   * doWork();
   * ```
   *
   * @param {string | symbol=} [key=this.id] A unique key identifying the resource to release.
   *   If not provided, the default instance-wide lock is assumed.
   * @returns {void}
   */
  public release(key: string | symbol = this.id): void {
    const currentLock = this.locks.get(key);
    if (currentLock === undefined) {
      return;
    }

    if (currentLock.timeoutId) {
      clearTimeout(currentLock.timeoutId);
    }
    this.locks.delete(key);

    const queue = this.queues.get(key);
    if (queue !== undefined && queue.size > 0) {
      const nextItem = queue.dequeue();
      if (nextItem) {
        nextItem.attempt();
      }

      if (queue.size === 0) {
        this.queues.delete(key);
      }
    }
  }

  /**
   * Releases all currently held locks and rejects all pending acquisition requests.
   * This effectively resets the mutex and makes it unusable for any pending
   * operations, which will fail with an error.
   *
   * @example
   * ```typescript
   * const mutex = new Mutex();
   *
   * mutex.acquire('task1').then(() => console.log('This will not be reached'));
   *
   * // Dispose of the mutex, cleaning up all state.
   * mutex.dispose();
   * // The pending acquire promise will be rejected with an 'Mutex disposed' error.
   * ```
   *
   * @returns {void}
   */
  public dispose(): void {
    for (const lock of this.locks.values()) {
      if (lock.timeoutId) {
        clearTimeout(lock.timeoutId);
      }
    }
    this.locks.clear();

    const reason = new Error('Mutex disposed');
    for (const queue of this.queues.values()) {
      while (queue.size > 0) {
        const item = queue.dequeue();
        if (item) {
          item.reject(reason);
        }
      }
    }
    this.queues.clear();
  }
}
