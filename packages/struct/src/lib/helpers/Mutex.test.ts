import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { Mutex } from './Mutex';

import type { MockInstance } from 'vitest';

describe('Mutex', () => {
  let mutex: Mutex;

  let setTimeoutSpy: MockInstance<typeof setTimeout>;
  let clearTimeoutSpy: MockInstance<typeof clearTimeout>;
  let dateNowSpy: MockInstance<typeof Date.now>;

  beforeEach(() => {
    vi.useFakeTimers();

    setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    dateNowSpy = vi.spyOn(Date, 'now');

    mutex = new Mutex();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  describe('lock', () => {
    test('should acquire a lock successfully when no lock exists', () => {
      const key = 'testKey';

      const result = mutex.lock(key);

      expect(result).toBe(false);
      expect(mutex['locks'].has(key)).toBe(true);
      expect(setTimeoutSpy).not.toHaveBeenCalled();
    });

    test('should return true if the lock is already held', () => {
      const key = 'testKey';
      mutex.lock(key);

      const result = mutex.lock(key);

      expect(result).toBe(true);
      expect(mutex['locks'].size).toBe(1);
    });

    test('should return true if the lock has pending items in its queue', async () => {
      const key = 'testKey';
      mutex.lock(key);
      const acquirePromise = mutex.acquire(key);

      const result = mutex.lock(key);

      expect(result).toBe(true);

      mutex.release(key);
      await acquirePromise;
    });

    test('should set a timeout for the lock if timeout is provided and positive', () => {
      const key = 'testKey';
      const timeout = 100;

      mutex.lock(key, timeout);

      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), timeout);

      vi.advanceTimersByTime(timeout);

      expect(mutex['locks'].has(key)).toBe(false);
    });

    test('should set a timeout for the lock if timeout is 0', () => {
      const key = 'testKey';
      const timeout = 0;

      mutex.lock(key, timeout);

      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), timeout);

      vi.advanceTimersByTime(timeout);

      expect(mutex['locks'].has(key)).toBe(false);
    });

    test('should not set a timeout if timeout is negative', () => {
      const key = 'testKey';
      const timeout = -100;

      mutex.lock(key, timeout);

      expect(setTimeoutSpy).not.toHaveBeenCalled();
      expect(mutex['locks'].has(key)).toBe(true);
    });

    test('should use the default ID if no key is provided', () => {
      mutex.lock();

      expect(mutex['locks'].has(mutex['id'])).toBe(true);
    });

    test('should handle multiple distinct locks', () => {
      const key1 = 'key1';
      const key2 = Symbol('key2');

      expect(mutex.lock(key1)).toBe(false);
      expect(mutex.lock(key2)).toBe(false);

      expect(mutex['locks'].has(key1)).toBe(true);
      expect(mutex['locks'].has(key2)).toBe(true);
      expect(mutex['locks'].size).toBe(2);
    });
  });

  describe('acquire', () => {
    test('should acquire an available lock immediately', async () => {
      const key = 'testKey';

      const acquirePromise = mutex.acquire(key);
      await expect(acquirePromise).resolves.toBeUndefined();

      expect(mutex['locks'].has(key)).toBe(true);
      expect(mutex['queues'].has(key)).toBe(false);
    });

    test('should queue acquisition if lock is already held and resolve when released', async () => {
      const key = 'testKey';
      mutex.lock(key);
      let resolved1 = false;

      const acquirePromise1 = mutex.acquire(key);
      acquirePromise1.then(() => {
        resolved1 = true;
      });

      expect(resolved1).toBe(false);
      expect(mutex['queues'].has(key)).toBe(true);
      expect(mutex['queues'].get(key)?.length).toBe(1);

      mutex.release(key);
      await vi.runAllTimersAsync();

      expect(resolved1).toBe(true);
      expect(mutex['locks'].has(key)).toBe(true);
      expect(mutex['queues'].has(key)).toBe(false);
    });

    test('should handle multiple queued acquisitions based on priority', async () => {
      const key = 'testKey';
      mutex.lock(key);
      const order: string[] = [];

      const p1 = mutex.acquire(key, 0).then(() => {
        order.push('P1');
      });
      dateNowSpy.mockReturnValue(Date.now() + 100);
      const p2 = mutex.acquire(key, 10).then(() => {
        order.push('P2');
      });
      dateNowSpy.mockReturnValue(Date.now() + 200);
      const p3 = mutex.acquire(key, 5).then(() => {
        order.push('P3');
      });

      mutex.release(key);
      await vi.runAllTimersAsync();
      expect(order).toEqual(['P2']);

      mutex.release(key);
      await vi.runAllTimersAsync();
      expect(order).toEqual(['P2', 'P3']);

      mutex.release(key);
      await vi.runAllTimersAsync();
      expect(order).toEqual(['P2', 'P3', 'P1']);

      await Promise.all([p1, p2, p3]);
    });

    test('should handle multiple queued acquisitions with same priority based on timestamp (FIFO)', async () => {
      const key = 'testKey';
      mutex.lock(key);
      const order: string[] = [];

      const p1 = mutex.acquire(key, 5).then(() => {
        order.push('P1');
      });
      dateNowSpy.mockReturnValue(Date.now() + 100);
      const p2 = mutex.acquire(key, 5).then(() => {
        order.push('P2');
      });
      dateNowSpy.mockReturnValue(Date.now() + 200);
      const p3 = mutex.acquire(key, 5).then(() => {
        order.push('P3');
      });

      mutex.release(key);
      await vi.runAllTimersAsync();
      expect(order).toEqual(['P1']);

      mutex.release(key);
      await vi.runAllTimersAsync();
      expect(order).toEqual(['P1', 'P2']);

      mutex.release(key);
      await vi.runAllTimersAsync();
      expect(order).toEqual(['P1', 'P2', 'P3']);

      await Promise.all([p1, p2, p3]);
    });

    test('should apply timeout to the acquired lock itself', async () => {
      const key = 'testKey';
      const timeout = 100;

      const acquirePromise = mutex.acquire(key, 0, timeout);
      await acquirePromise;

      expect(mutex['locks'].has(key)).toBe(true);
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), timeout);

      vi.advanceTimersByTime(timeout / 2);
      expect(mutex['locks'].has(key)).toBe(true);

      vi.advanceTimersByTime(timeout / 2);
      expect(mutex['locks'].has(key)).toBe(false);
    });

    test('should not apply timeout if timeout is negative', async () => {
      const key = 'testKey';
      const timeout = -100;

      const acquirePromise = mutex.acquire(key, 0, timeout);
      await acquirePromise;

      expect(mutex['locks'].has(key)).toBe(true);
      expect(setTimeoutSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(mutex['locks'].has(key)).toBe(true);
    });

    test('should use the default ID if no key is provided', async () => {
      const acquirePromise = mutex.acquire();
      await acquirePromise;

      expect(mutex['locks'].has(mutex['id'])).toBe(true);
    });

    test('should create a new queue if one does not exist for the key', async () => {
      const key = 'testKey';
      mutex.lock(key);

      expect(mutex['queues'].has(key)).toBe(false);

      const acquirePromise = mutex.acquire(key);

      expect(mutex['queues'].has(key)).toBe(true);
      expect(mutex['queues'].get(key)).toBeInstanceOf(Array);

      mutex.release(key);
      await acquirePromise;
    });
  });

  describe('release', () => {
    test('should release an existing lock with no queue', () => {
      const key = 'testKey';
      mutex.lock(key);
      expect(mutex['locks'].has(key)).toBe(true);

      mutex.release(key);

      expect(mutex['locks'].has(key)).toBe(false);
      expect(clearTimeoutSpy).not.toHaveBeenCalled();
    });

    test('should do nothing if the lock does not exist', () => {
      const key = 'nonExistentKey';

      mutex.release(key);

      expect(mutex['locks'].size).toBe(0);
      expect(mutex['queues'].size).toBe(0);
    });

    test('should clear the timeout if the released lock had one', () => {
      const key = 'testKey';
      mutex.lock(key, 1000);
      expect(mutex['locks'].has(key)).toBe(true);
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

      mutex.release(key);

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
      expect(mutex['locks'].has(key)).toBe(false);
    });

    test('should activate the next item in the queue upon release', async () => {
      const key = 'testKey';
      mutex.lock(key);
      const order: string[] = [];

      const p1 = mutex.acquire(key).then(() => {
        order.push('P1');
      });
      const p2 = mutex.acquire(key).then(() => {
        order.push('P2');
      });

      expect(order).toEqual([]);
      expect(mutex['queues'].get(key)?.length).toBe(2);

      mutex.release(key);
      await vi.runAllTimersAsync();
      expect(order).toEqual(['P1']);
      expect(mutex['locks'].has(key)).toBe(true);
      expect(mutex['queues'].get(key)?.length).toBe(1);

      mutex.release(key);
      await vi.runAllTimersAsync();
      expect(order).toEqual(['P1', 'P2']);
      expect(mutex['locks'].has(key)).toBe(true);
      expect(mutex['queues'].has(key)).toBe(false);

      await Promise.all([p1, p2]);
    });

    test('should remove the queue if it becomes empty after release', async () => {
      const key = 'testKey';
      mutex.lock(key);

      const acquirePromise = mutex.acquire(key);

      expect(mutex['queues'].has(key)).toBe(true);
      expect(mutex['queues'].get(key)?.length).toBe(1);

      mutex.release(key);
      await acquirePromise;

      expect(mutex['queues'].has(key)).toBe(false);
    });

    test('should use the default ID if no key is provided', () => {
      mutex.lock();
      expect(mutex['locks'].has(mutex['id'])).toBe(true);

      mutex.release();
      expect(mutex['locks'].has(mutex['id'])).toBe(false);
    });
  });

  describe('dispose', () => {
    test('should clear all active locks and their timeouts', () => {
      const key1 = 'key1';
      const key2 = 'key2';
      mutex.lock(key1, 100);
      mutex.lock(key2);
      expect(mutex['locks'].size).toBe(2);
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

      mutex.dispose();

      expect(mutex['locks'].size).toBe(0);
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    });

    test('should reject all pending queue items', async () => {
      const key1 = 'key1';
      const key2 = 'key2';
      mutex.lock(key1);
      mutex.lock(key2);

      const p1 = mutex.acquire(key1);
      const p2 = mutex.acquire(key1);
      const p3 = mutex.acquire(key2);

      expect(mutex['queues'].get(key1)?.length).toBe(2);
      expect(mutex['queues'].get(key2)?.length).toBe(1);

      mutex.dispose();

      await expect(p1).rejects.toThrow('Mutex disposed');
      await expect(p2).rejects.toThrow('Mutex disposed');
      await expect(p3).rejects.toThrow('Mutex disposed');
      expect(mutex['queues'].size).toBe(0);
    });

    test('should do nothing if no locks or queues exist', () => {
      expect(mutex['locks'].size).toBe(0);
      expect(mutex['queues'].size).toBe(0);

      mutex.dispose();

      expect(mutex['locks'].size).toBe(0);
      expect(mutex['queues'].size).toBe(0);
    });

    test('should handle a combination of active locks and pending queues', async () => {
      const key1 = 'key1';
      const key2 = 'key2';
      mutex.lock(key1, 100);
      mutex.lock(key2);

      const p1 = mutex.acquire(key1);
      const p2 = mutex.acquire(key2);

      expect(mutex['locks'].size).toBe(2);
      expect(mutex['queues'].size).toBe(2);
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

      mutex.dispose();

      expect(mutex['locks'].size).toBe(0);
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
      expect(mutex['queues'].size).toBe(0);
      await expect(p1).rejects.toThrow('Mutex disposed');
      await expect(p2).rejects.toThrow('Mutex disposed');
    });
  });
});
