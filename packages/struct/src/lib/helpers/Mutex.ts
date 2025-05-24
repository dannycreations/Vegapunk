/**
 * A mutual exclusion lock (Mutex) used to control access to a shared resource,
 * ensuring that only one operation can access the resource at any given time.
 * It supports both simple locking/unlocking and a prioritized asynchronous acquisition queue.
 */
export class Mutex {
  /**
   * Attempts to acquire the lock. If a timeout is provided, the lock will be
   * automatically released after the specified duration.
   *
   * @example
   * const mutex = new Mutex();
   * if (!mutex.lock(5000)) {
   *   console.log('Lock acquired successfully for 5 seconds.');
   *   // Critical section code here...
   *   // mutex.unlock(); // Optionally unlock sooner if work is done
   * } else {
   *   console.log('Mutex is already locked.');
   * }
   *
   * @param {number=} timeout The duration in milliseconds after which the lock
   *     is automatically released.
   * @returns {boolean} `true` if the mutex was already locked by a previous
   *     call to `lock()`, `false` if the lock was successfully acquired by this call.
   */
  public lock(timeout?: number): boolean {
    if (this.isLocked) return true

    this.isLocked = true
    if (typeof timeout === 'number') {
      this.lockTimeout = setTimeout(() => {
        this.unlock()
      }, timeout)
    }
    return false
  }

  /**
   * Releases the lock previously acquired by `lock()`.
   * If a timeout was set during locking, it will be cleared.
   *
   * @example
   * const mutex = new Mutex();
   * if (!mutex.lock()) {
   *   console.log('Lock acquired.');
   *   // Critical section code here...
   *   mutex.unlock();
   *   console.log('Lock released.');
   * }
   *
   * @returns {void}
   */
  public unlock(): void {
    if (!this.isLocked) return

    this.isLocked = false

    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout)
      this.lockTimeout = undefined
    }
  }

  /**
   * Asynchronously acquires the lock. Tasks are queued based on priority (higher
   * numbers mean higher priority) and then by the timestamp of the request.
   * If a timeout is provided, the acquired lock will be automatically released
   * after the specified duration.
   *
   * @example
   * const mutex = new Mutex();
   * async function criticalTask(taskId: string, taskPriority: number) {
   *   console.log(`Task ${taskId} (priority ${taskPriority}) waiting for lock.`);
   *   await mutex.acquire(taskPriority, 2000); // Auto-release after 2s
   *   console.log(`Task ${taskId} acquired lock.`);
   *   // Simulate work
   *   await new Promise(resolve => setTimeout(resolve, 500));
   *   console.log(`Task ${taskId} finished work.`);
   *   mutex.release(); // Release lock
   * }
   * criticalTask('A', 0);
   * criticalTask('B', 1); // Higher priority
   * criticalTask('C', 0);
   *
   * @param {number=} [priority=0] The priority of the acquire request. Higher
   *     numbers indicate higher priority.
   * @param {number=} timeout The duration in milliseconds after which the
   *     acquired lock is automatically released.
   * @returns {Promise<void>} A promise that resolves when the lock is acquired.
   */
  public async acquire(priority: number = 0, timeout?: number): Promise<void> {
    return new Promise((resolve) => {
      const attempt = () => {
        if (!this.isAqquired) {
          this.isAqquired = true
          if (typeof timeout === 'number') {
            this.aqquireTimeout = setTimeout(() => {
              this.release()
            }, timeout)
          }
          return resolve()
        }

        const timestamp = Date.now()
        this.queue.push({ attempt, priority, timestamp })
        this.queue.sort((a, b) => {
          if (b.priority === a.priority) {
            return a.timestamp - b.timestamp
          }
          return b.priority - a.priority
        })
      }
      attempt()
    })
  }

  /**
   * Releases the lock previously acquired by `acquire()`. If there are tasks
   * waiting in the queue, the next highest priority task will then acquire the lock.
   * If a timeout was set during acquisition, it will be cleared.
   *
   * @example
   * const mutex = new Mutex();
   * async function performAction() {
   *   await mutex.acquire();
   *   try {
   *     console.log('Lock acquired, performing action.');
   *     // Critical section code here...
   *   } finally {
   *     mutex.release();
   *     console.log('Lock released.');
   *   }
   * }
   * performAction();
   *
   * @returns {void}
   */
  public release(): void {
    if (!this.isAqquired) return

    this.isAqquired = false

    if (this.aqquireTimeout) {
      clearTimeout(this.aqquireTimeout)
      this.aqquireTimeout = undefined
    }

    const queue = this.queue.shift()
    queue && queue.attempt()
  }

  protected isLocked = false
  protected isAqquired = false
  protected lockTimeout?: NodeJS.Timeout
  protected aqquireTimeout?: NodeJS.Timeout
  protected readonly queue: MutexData[] = []
}

export interface MutexData {
  priority: number
  timestamp: number
  attempt: () => void
}
