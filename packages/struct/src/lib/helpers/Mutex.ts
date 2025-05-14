/**
 * A lightweight Mutex (mutual exclusion) implementation that provides mechanisms
 * for locking, unlocking, acquiring, and releasing resources in a thread-safe manner.
 */
export class Mutex {
  /**
   * Locks the mutex, optionally setting a timeout after which the lock will automatically release.
   *
   * @param {number} [timeout] - Optional timeout in milliseconds to automatically release the lock.
   * @returns {boolean} - Returns `true` if the mutex was already locked, otherwise `false`.
   *
   * @example
   * const mutex = new Mutex();
   * if (!mutex.lock(1000)) {
   *   console.log("Locked successfully!");
   * } else {
   *   console.log("Already locked.");
   * }
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
   * Unlocks the mutex, canceling any active lock timeout.
   *
   * @returns {void}
   *
   * @example
   * const mutex = new Mutex();
   * mutex.lock();
   * mutex.unlock();
   * console.log("Mutex is unlocked.");
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
   * Acquires the mutex asynchronously, with an optional priority and timeout.
   * If the mutex is already acquired, the request is queued based on priority.
   *
   * @param {number} [priority=0] - Priority of the acquire operation (higher values are prioritized).
   * @param {number} [timeout] - Optional timeout in milliseconds to automatically release the acquire.
   * @returns {Promise<void>} - Resolves when the mutex is successfully acquired.
   *
   * @example
   * const mutex = new Mutex();
   * await mutex.acquire(1, 1000);
   * console.log("Mutex acquired with priority 1 and 1-second timeout.");
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
   * Releases the acquired mutex, allowing the next item in the queue to acquire it.
   * Cancels any active acquire timeout.
   *
   * @returns {void}
   *
   * @example
   * const mutex = new Mutex();
   * await mutex.acquire();
   * console.log("Doing some work...");
   * mutex.release();
   * console.log("Mutex released.");
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
