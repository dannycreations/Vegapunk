import { EventEmitter } from 'node:events';
import { Result } from '@vegapunk/utilities/result';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { Collector } from './Collector';

import type { GatherOptions } from './Collector';

const mockEventEmitterInstance = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  removeAllListeners: vi.fn(),
};

vi.mock('node:events', () => ({
  EventEmitter: vi.fn(function EventEmitter() {
    return mockEventEmitterInstance;
  }),
}));

describe('Collector', () => {
  let collector: Collector;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    collector = new Collector();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Constructor', () => {
    test('should initialize with a unique symbol id', () => {
      expect(typeof collector['id']).toBe('symbol');
      expect(collector['id'].description).toBe(Collector.name);

      const anotherCollector = new Collector();
      expect(collector['id']).not.toBe(anotherCollector['id']);
    });

    test('should initialize emitter as an EventEmitter instance', () => {
      expect(EventEmitter).toHaveBeenCalledTimes(1);
      expect(collector['emitter']).toBe(mockEventEmitterInstance);
    });

    test('should initialize gathers as an empty Set', () => {
      expect(collector['gathers']).toBeInstanceOf(Set);
      expect(collector['gathers'].size).toBe(0);
    });
  });

  describe('inspect', () => {
    test('should emit data with the default id key', () => {
      const testData = { value: 'test' };
      const expectedId = collector['id'];

      collector.inspect(testData);

      expect(mockEventEmitterInstance.emit).toHaveBeenCalledTimes(1);
      expect(mockEventEmitterInstance.emit).toHaveBeenCalledWith(expectedId, testData);
    });

    test('should emit data with a custom string key', () => {
      const testData = 123;
      const customKey = 'myEvent';

      collector.inspect(testData, customKey);

      expect(mockEventEmitterInstance.emit).toHaveBeenCalledTimes(1);
      expect(mockEventEmitterInstance.emit).toHaveBeenCalledWith(customKey, testData);
    });

    test('should emit data with a custom symbol key', () => {
      const testData = ['a', 'b'];
      const customKey = Symbol('customSymbol');

      collector.inspect(testData, customKey);

      expect(mockEventEmitterInstance.emit).toHaveBeenCalledTimes(1);
      expect(mockEventEmitterInstance.emit).toHaveBeenCalledWith(customKey, testData);
    });
  });

  describe('gather', () => {
    test('should collect data until max is reached', async () => {
      const options: GatherOptions<number> = {
        filter: (data) => data > 0,
        max: 2,
        timeout: 500,
      };
      const gatherPromise = collector.gather(options);

      expect(mockEventEmitterInstance.on).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(1);

      const [eventKey, listener] = vi.mocked(mockEventEmitterInstance.on).mock.lastCall!;

      listener(10);
      expect(mockEventEmitterInstance.off).not.toHaveBeenCalled();

      listener(20);
      expect(mockEventEmitterInstance.off).toHaveBeenCalledTimes(1);
      expect(mockEventEmitterInstance.off).toHaveBeenCalledWith(eventKey, listener);
      expect(vi.getTimerCount()).toBe(0);

      await expect(gatherPromise).resolves.toEqual(Result.ok([10, 20]));
    });

    test('should collect data until timeout is reached', async () => {
      const options: GatherOptions<number> = {
        filter: () => true,
        max: 5,
        timeout: 100,
      };
      const gatherPromise = collector.gather(options);

      expect(mockEventEmitterInstance.on).toHaveBeenCalledTimes(1);
      const [eventKey, listener] = vi.mocked(mockEventEmitterInstance.on).mock.lastCall!;

      listener(10);
      expect(mockEventEmitterInstance.off).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(mockEventEmitterInstance.off).toHaveBeenCalledTimes(1);
      expect(mockEventEmitterInstance.off).toHaveBeenCalledWith(eventKey, listener);

      await expect(gatherPromise).resolves.toEqual(Result.ok([10]));
    });

    test('should filter data correctly', async () => {
      const options: GatherOptions<number> = {
        filter: (data: number) => data % 2 === 0,
        max: 2,
        timeout: 500,
      };
      const gatherPromise = collector.gather(options);

      expect(mockEventEmitterInstance.on).toHaveBeenCalledTimes(1);
      const listener = vi.mocked(mockEventEmitterInstance.on).mock.lastCall![1];

      listener(1);
      listener(2);
      listener(3);
      listener(4);

      await expect(gatherPromise).resolves.toEqual(Result.ok([2, 4]));
    });

    test('should collect indefinitely if max is 0 until timeout', async () => {
      const options: GatherOptions<string> = {
        filter: () => true,
        max: 0,
        timeout: 100,
      };
      const gatherPromise = collector.gather(options);

      expect(mockEventEmitterInstance.on).toHaveBeenCalledTimes(1);
      const listener = vi.mocked(mockEventEmitterInstance.on).mock.lastCall![1];

      listener('a');
      listener('b');
      listener('c');

      vi.advanceTimersByTime(100);

      await expect(gatherPromise).resolves.toEqual(Result.ok(['a', 'b', 'c']));
    });

    test('should use a custom key for gathering', async () => {
      const customKey = 'customGatherKey';
      const options: GatherOptions<string> = { filter: () => true, max: 1 };
      const gatherPromise = collector.gather(options, customKey);

      expect(mockEventEmitterInstance.on).toHaveBeenCalledTimes(1);
      expect(mockEventEmitterInstance.on).toHaveBeenCalledWith(customKey, expect.any(Function));

      const listener = vi.mocked(mockEventEmitterInstance.on).mock.lastCall![1];
      listener('data');

      await expect(gatherPromise).resolves.toEqual(Result.ok(['data']));
    });

    test('should return Result.err if timeout occurs and an error message is provided', async () => {
      const options: GatherOptions<unknown> = {
        filter: () => true,
        max: 2,
        timeout: 100,
        error: 'Gather failed due to timeout!',
      };
      const gatherPromise = collector.gather(options);

      vi.advanceTimersByTime(100);

      await expect(gatherPromise).resolves.toEqual(Result.err(new Error('Gather failed due to timeout!')));
    });

    test('should return Result.ok with an empty array if timeout occurs without an error message', async () => {
      const options: GatherOptions<unknown> = {
        filter: () => true,
        max: 2,
        timeout: 100,
      };
      const gatherPromise = collector.gather(options);

      vi.advanceTimersByTime(100);

      await expect(gatherPromise).resolves.toEqual(Result.ok([]));
    });

    test('should handle multiple concurrent gathers with different keys', async () => {
      const options1: GatherOptions<number> = {
        filter: () => true,
        max: 1,
        timeout: 500,
      };
      const options2: GatherOptions<string> = {
        filter: () => true,
        max: 1,
        timeout: 500,
      };

      const gatherPromise1 = collector.gather(options1, 'key1');
      const gatherPromise2 = collector.gather(options2, 'key2');

      expect(mockEventEmitterInstance.on).toHaveBeenCalledTimes(2);

      const onCalls = vi.mocked(mockEventEmitterInstance.on).mock.calls;
      const [key1, listener1] = onCalls[0];
      const [key2, listener2] = onCalls[1];

      expect(key1).toBe('key1');
      expect(key2).toBe('key2');

      listener1(100);
      listener2('hello');

      await expect(gatherPromise1).resolves.toEqual(Result.ok([100]));
      await expect(gatherPromise2).resolves.toEqual(Result.ok(['hello']));
      expect(mockEventEmitterInstance.off).toHaveBeenCalledTimes(2);
    });

    test('should handle multiple concurrent gathers with the same key', async () => {
      const options1: GatherOptions<number> = {
        filter: (data: number) => data < 5,
        max: 1,
        timeout: 500,
      };
      const options2: GatherOptions<number> = {
        filter: (data: number) => data >= 5,
        max: 1,
        timeout: 500,
      };

      const gatherPromise1 = collector.gather(options1, 'sharedKey');
      const gatherPromise2 = collector.gather(options2, 'sharedKey');

      expect(mockEventEmitterInstance.on).toHaveBeenCalledTimes(2);

      const listeners = vi
        .mocked(mockEventEmitterInstance.on)
        .mock.calls.filter(([key]) => key === 'sharedKey')
        .map(([, listener]) => listener);
      expect(listeners.length).toBe(2);

      listeners.forEach((listener) => {
        return listener(3);
      });
      listeners.forEach((listener) => {
        return listener(7);
      });

      await expect(gatherPromise1).resolves.toEqual(Result.ok([3]));
      await expect(gatherPromise2).resolves.toEqual(Result.ok([7]));
      expect(mockEventEmitterInstance.off).toHaveBeenCalledTimes(2);
    });

    test('should resolve with Result.err when dispose is called during an active gather', async () => {
      const options: GatherOptions<number> = {
        filter: () => true,
        max: 5,
        timeout: 500,
      };
      const gatherPromise = collector.gather(options);

      expect(mockEventEmitterInstance.on).toHaveBeenCalledTimes(1);
      const listener = vi.mocked(mockEventEmitterInstance.on).mock.lastCall![1];
      listener(1);
      listener(2);

      collector.dispose();

      await expect(gatherPromise).resolves.toEqual(Result.err(new Error('Collector disposed!')));
      expect(mockEventEmitterInstance.off).toHaveBeenCalledTimes(1);
      expect(mockEventEmitterInstance.removeAllListeners).toHaveBeenCalledTimes(1);
    });
  });

  describe('dispose', () => {
    test('should resolve all active gather promises with a dispose error', async () => {
      const options1: GatherOptions<number> = {
        filter: () => true,
        max: 5,
        timeout: 500,
      };
      const options2: GatherOptions<string> = {
        filter: () => true,
        max: 5,
        timeout: 500,
      };

      const gatherPromise1 = collector.gather(options1, 'key1');
      const gatherPromise2 = collector.gather(options2, 'key2');

      expect(collector['gathers'].size).toBe(2);
      expect(mockEventEmitterInstance.on).toHaveBeenCalledTimes(2);

      collector.dispose();

      const expectedErrorResult = Result.err(new Error('Collector disposed!'));
      const [result1, result2] = await Promise.all([gatherPromise1, gatherPromise2]);

      expect(result1).toEqual(expectedErrorResult);
      expect(result2).toEqual(expectedErrorResult);
      expect(collector['gathers'].size).toBe(0);
      expect(mockEventEmitterInstance.off).toHaveBeenCalledTimes(2);
      expect(mockEventEmitterInstance.removeAllListeners).toHaveBeenCalledTimes(1);
    });

    test('should do nothing if no gathers are active', () => {
      expect(collector['gathers'].size).toBe(0);

      collector.dispose();

      expect(collector['gathers'].size).toBe(0);
      expect(mockEventEmitterInstance.removeAllListeners).toHaveBeenCalledTimes(1);
      expect(mockEventEmitterInstance.off).not.toHaveBeenCalled();
    });

    test('should prevent further collection for disposed gathers', async () => {
      const options: GatherOptions<number> = {
        filter: () => true,
        max: 1,
        timeout: 500,
      };
      const gatherPromise = collector.gather(options);

      expect(mockEventEmitterInstance.on).toHaveBeenCalledTimes(1);
      const listener = vi.mocked(mockEventEmitterInstance.on).mock.lastCall![1];

      collector.dispose();

      const disposedError = Result.err(new Error('Collector disposed!'));
      await expect(gatherPromise).resolves.toEqual(disposedError);

      listener(100);

      await expect(gatherPromise).resolves.toEqual(disposedError);
    });
  });
});
