import { EventEmitter } from 'node:events';
import { Result } from '@vegapunk/utilities/result';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Collector } from './Collector';

import type { GatherOptions } from './Collector';

const mockEventEmitter = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  removeAllListeners: vi.fn(),
};

vi.mock('node:events', () => ({
  EventEmitter: vi.fn(function EventEmitter() {
    return mockEventEmitter;
  }),
}));

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
  it('should initialize with a unique symbol id', () => {
    expect(typeof collector['id']).toBe('symbol');
    expect(collector['id'].description).toBe(Collector.name);

    const anotherCollector = new Collector();
    expect(collector['id']).not.toBe(anotherCollector['id']);
  });

  it('should initialize emitter as an EventEmitter instance', () => {
    expect(EventEmitter).toHaveBeenCalledTimes(1);
    expect(collector['emitter']).toBe(mockEventEmitter);
  });

  it('should initialize gathers as an empty Set', () => {
    expect(collector['gathers']).toBeInstanceOf(Set);
    expect(collector['gathers'].size).toBe(0);
  });
});

describe('inspect', () => {
  it('should emit data with the default id key', () => {
    const testData = { value: 'test' };
    const expectedId = collector['id'];

    collector.inspect(testData);

    expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(expectedId, testData);
  });

  it('should emit data with a custom string key', () => {
    const testData = 123;
    const customKey = 'myEvent';

    collector.inspect(testData, customKey);

    expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(customKey, testData);
  });

  it('should emit data with a custom symbol key', () => {
    const testData = ['a', 'b'];
    const customKey = Symbol('customSymbol');

    collector.inspect(testData, customKey);

    expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(customKey, testData);
  });
});

describe('gather', () => {
  it('should collect data until max is reached', async () => {
    const options: GatherOptions<number> = {
      filter: (data) => data > 0,
      max: 2,
      timeout: 500,
    };
    const gatherPromise = collector.gather(options);

    expect(mockEventEmitter.on).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);

    const [eventKey, listener] = vi.mocked(mockEventEmitter.on).mock.lastCall!;

    listener(10);
    expect(mockEventEmitter.off).not.toHaveBeenCalled();

    listener(20);
    expect(mockEventEmitter.off).toHaveBeenCalledTimes(1);
    expect(mockEventEmitter.off).toHaveBeenCalledWith(eventKey, listener);
    expect(vi.getTimerCount()).toBe(0);

    await expect(gatherPromise).resolves.toEqual(Result.ok([10, 20]));
  });

  it('should collect data until timeout is reached', async () => {
    const options: GatherOptions<number> = {
      filter: () => true,
      max: 5,
      timeout: 100,
    };
    const gatherPromise = collector.gather(options);

    expect(mockEventEmitter.on).toHaveBeenCalledTimes(1);
    const [eventKey, listener] = vi.mocked(mockEventEmitter.on).mock.lastCall!;

    listener(10);
    expect(mockEventEmitter.off).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(mockEventEmitter.off).toHaveBeenCalledTimes(1);
    expect(mockEventEmitter.off).toHaveBeenCalledWith(eventKey, listener);

    await expect(gatherPromise).resolves.toEqual(Result.ok([10]));
  });

  it('should filter data correctly', async () => {
    const options: GatherOptions<number> = {
      filter: (data: number) => data % 2 === 0,
      max: 2,
      timeout: 500,
    };
    const gatherPromise = collector.gather(options);

    expect(mockEventEmitter.on).toHaveBeenCalledTimes(1);
    const listener = vi.mocked(mockEventEmitter.on).mock.lastCall![1];

    listener(1);
    listener(2);
    listener(3);
    listener(4);

    await expect(gatherPromise).resolves.toEqual(Result.ok([2, 4]));
  });

  it('should collect indefinitely if max is 0 until timeout', async () => {
    const options: GatherOptions<string> = {
      filter: () => true,
      max: 0,
      timeout: 100,
    };
    const gatherPromise = collector.gather(options);

    expect(mockEventEmitter.on).toHaveBeenCalledTimes(1);
    const listener = vi.mocked(mockEventEmitter.on).mock.lastCall![1];

    listener('a');
    listener('b');
    listener('c');

    vi.advanceTimersByTime(100);

    await expect(gatherPromise).resolves.toEqual(Result.ok(['a', 'b', 'c']));
  });

  it('should use a custom key for gathering', async () => {
    const customKey = 'customGatherKey';
    const options: GatherOptions<string> = { filter: () => true, max: 1 };
    const gatherPromise = collector.gather(options, customKey);

    expect(mockEventEmitter.on).toHaveBeenCalledTimes(1);
    expect(mockEventEmitter.on).toHaveBeenCalledWith(customKey, expect.any(Function));

    const listener = vi.mocked(mockEventEmitter.on).mock.lastCall![1];
    listener('data');

    await expect(gatherPromise).resolves.toEqual(Result.ok(['data']));
  });

  it('should return Result.err if timeout occurs and an error message is provided', async () => {
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

  it('should return Result.ok with an empty array if timeout occurs without an error message', async () => {
    const options: GatherOptions<unknown> = {
      filter: () => true,
      max: 2,
      timeout: 100,
    };
    const gatherPromise = collector.gather(options);

    vi.advanceTimersByTime(100);

    await expect(gatherPromise).resolves.toEqual(Result.ok([]));
  });

  it('should handle multiple concurrent gathers with different keys', async () => {
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

    expect(mockEventEmitter.on).toHaveBeenCalledTimes(2);

    const onCalls = vi.mocked(mockEventEmitter.on).mock.calls;
    const [key1, listener1] = onCalls[0];
    const [key2, listener2] = onCalls[1];

    expect(key1).toBe('key1');
    expect(key2).toBe('key2');

    listener1(100);
    listener2('hello');

    await expect(gatherPromise1).resolves.toEqual(Result.ok([100]));
    await expect(gatherPromise2).resolves.toEqual(Result.ok(['hello']));
    expect(mockEventEmitter.off).toHaveBeenCalledTimes(2);
  });

  it('should handle multiple concurrent gathers with the same key', async () => {
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

    expect(mockEventEmitter.on).toHaveBeenCalledTimes(2);

    const listeners = vi
      .mocked(mockEventEmitter.on)
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
    expect(mockEventEmitter.off).toHaveBeenCalledTimes(2);
  });

  it('should resolve with Result.err when dispose is called during an active gather', async () => {
    const options: GatherOptions<number> = {
      filter: () => true,
      max: 5,
      timeout: 500,
    };
    const gatherPromise = collector.gather(options);

    expect(mockEventEmitter.on).toHaveBeenCalledTimes(1);
    const listener = vi.mocked(mockEventEmitter.on).mock.lastCall![1];
    listener(1);
    listener(2);

    collector.dispose();

    await expect(gatherPromise).resolves.toEqual(Result.err(new Error('Collector disposed!')));
    expect(mockEventEmitter.off).toHaveBeenCalledTimes(1);
    expect(mockEventEmitter.removeAllListeners).toHaveBeenCalledTimes(1);
  });
});

describe('dispose', () => {
  it('should resolve all active gather promises with a dispose error', async () => {
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
    expect(mockEventEmitter.on).toHaveBeenCalledTimes(2);

    collector.dispose();

    const expectedErrorResult = Result.err(new Error('Collector disposed!'));
    const [result1, result2] = await Promise.all([gatherPromise1, gatherPromise2]);

    expect(result1).toEqual(expectedErrorResult);
    expect(result2).toEqual(expectedErrorResult);
    expect(collector['gathers'].size).toBe(0);
    expect(mockEventEmitter.off).toHaveBeenCalledTimes(2);
    expect(mockEventEmitter.removeAllListeners).toHaveBeenCalledTimes(1);
  });

  it('should do nothing if no gathers are active', () => {
    expect(collector['gathers'].size).toBe(0);

    collector.dispose();

    expect(collector['gathers'].size).toBe(0);
    expect(mockEventEmitter.removeAllListeners).toHaveBeenCalledTimes(1);
    expect(mockEventEmitter.off).not.toHaveBeenCalled();
  });

  it('should prevent further collection for disposed gathers', async () => {
    const options: GatherOptions<number> = {
      filter: () => true,
      max: 1,
      timeout: 500,
    };
    const gatherPromise = collector.gather(options);

    expect(mockEventEmitter.on).toHaveBeenCalledTimes(1);
    const listener = vi.mocked(mockEventEmitter.on).mock.lastCall![1];

    collector.dispose();

    const disposedError = Result.err(new Error('Collector disposed!'));
    await expect(gatherPromise).resolves.toEqual(disposedError);

    listener(100);

    await expect(gatherPromise).resolves.toEqual(disposedError);
  });
});
