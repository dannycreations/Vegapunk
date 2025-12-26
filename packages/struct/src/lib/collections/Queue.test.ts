import { swap } from '@vegapunk/utilities';
import { isObjectLike, merge } from '@vegapunk/utilities/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Queue } from './Queue';

import type { Comparator } from '@vegapunk/utilities';

vi.mock('@vegapunk/utilities', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@vegapunk/utilities')>();
  return {
    ...mod,
    swap: vi.fn(mod.swap),
  };
});

vi.mock('@vegapunk/utilities/common', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@vegapunk/utilities/common')>();
  return {
    ...mod,
    isObjectLike: vi.fn(mod.isObjectLike),
  };
});

const numberAsc: Comparator<number> = (a: number, b: number): number => {
  return a - b;
};

type Item = {
  value: string;
  priority: number;
};

const objectAsc: Comparator<Item> = (a: Item, b: Item): number => {
  return a.priority - b.priority;
};

const mixedAsc: Comparator<number | Item> = (a: number | Item, b: number | Item): number => {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  if (isObjectLike(a) && isObjectLike(b)) {
    return (a as Item).priority - (b as Item).priority;
  }
  if (typeof a === 'number') {
    return -1;
  }
  if (typeof b === 'number') {
    return 1;
  }
  return 0;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('constructor', () => {
  it('should create an empty queue with a default comparator if none is provided', () => {
    const queue = new Queue<number>();
    expect(queue.size).toBe(0);
    expect(queue.last).toBeUndefined();
    expect(queue['compare'](1, 2)).toBe(0);
  });

  it('should create an empty queue with the provided comparator', () => {
    const queue = new Queue<number>(numberAsc);
    expect(queue.size).toBe(0);
    expect(queue.last).toBeUndefined();
    expect(queue['compare'](1, 2)).toBe(-1);
    expect(queue['compare'](2, 1)).toBe(1);
  });
});

describe('size getter', () => {
  it('should return 0 for an empty queue', () => {
    const queue = new Queue<number>(numberAsc);
    expect(queue.size).toBe(0);
  });

  it('should return the correct size after enqueuing elements', () => {
    const queue = new Queue<number>(numberAsc);
    queue.enqueue(10, 20, 30);
    expect(queue.size).toBe(3);
  });

  it('should return the correct size after dequeuing elements', () => {
    const queue = new Queue<number>(numberAsc);
    queue.enqueue(10, 20, 30);
    queue.dequeue();
    expect(queue.size).toBe(2);
  });

  it('should return 0 after clearing the queue', () => {
    const queue = new Queue<number>(numberAsc);
    queue.enqueue(10, 20, 30);
    queue.clear();
    expect(queue.size).toBe(0);
  });
});

describe('last getter', () => {
  it('should return undefined for an empty queue', () => {
    const queue = new Queue<number>(numberAsc);
    expect(queue.last).toBeUndefined();
  });

  it('should return the last dequeued element', () => {
    const queue = new Queue<number>(numberAsc);
    queue.enqueue(5, 1, 8, 3);

    expect(queue.dequeue()).toBe(1);
    expect(queue.last).toBe(1);

    expect(queue.dequeue()).toBe(3);
    expect(queue.last).toBe(3);
  });

  it('should be undefined after clearing the queue', () => {
    const queue = new Queue<number>(numberAsc);
    queue.enqueue(1);
    queue.dequeue();
    expect(queue.last).toBe(1);

    queue.clear();
    expect(queue.last).toBeUndefined();
  });
});

describe('peek method', () => {
  it('should return undefined for an empty queue', () => {
    const queue = new Queue<number>(numberAsc);
    expect(queue.peek()).toBeUndefined();
    expect(queue.peek(0)).toBeUndefined();
    expect(queue.peek(5)).toBeUndefined();
  });

  it('should return the element at the specified index (default 0)', () => {
    const queue = new Queue<number>(numberAsc);
    queue.enqueue(5, 1, 8, 3);

    expect(queue.peek()).toBe(1);
    expect(queue.peek(0)).toBe(1);
    expect(queue.peek(1)).toBe(3);
    expect(queue.peek(2)).toBe(8);
    expect(queue.peek(3)).toBe(5);
  });

  it('should return undefined if the index is out of bounds', () => {
    const queue = new Queue<number>(numberAsc);
    queue.enqueue(10);
    expect(queue.peek(1)).toBeUndefined();
    expect(queue.peek(-1)).toBeUndefined();
  });
});

describe('enqueue method', () => {
  it('should add single elements and maintain heap property (min-heap)', () => {
    const queue = new Queue<number>(numberAsc);

    queue.enqueue(10);
    expect(queue.size).toBe(1);
    expect(queue.peek()).toBe(10);

    queue.enqueue(5);
    expect(queue.size).toBe(2);
    expect(queue.peek()).toBe(5);

    queue.enqueue(15);
    expect(queue.size).toBe(3);
    expect(queue.peek()).toBe(5);

    queue.enqueue(3);
    expect(queue.size).toBe(4);
    expect(queue.peek()).toBe(3);

    expect(swap).toHaveBeenCalled();
  });

  it('should add multiple elements and maintain heap property (min-heap)', () => {
    const queue = new Queue<number>(numberAsc);
    queue.enqueue(10, 5, 15, 3, 7, 12);

    expect(queue.size).toBe(6);
    expect(queue.peek()).toBe(3);
    expect(queue.dequeue()).toBe(3);
    expect(queue.dequeue()).toBe(5);
    expect(queue.dequeue()).toBe(7);
    expect(queue.dequeue()).toBe(10);
    expect(queue.dequeue()).toBe(12);
    expect(queue.dequeue()).toBe(15);
    expect(queue.size).toBe(0);
  });

  it('should handle duplicate values correctly', () => {
    const queue = new Queue<number>(numberAsc);
    queue.enqueue(5, 2, 5, 1, 2);

    expect(queue.size).toBe(5);
    expect(queue.peek()).toBe(1);
    expect(queue.dequeue()).toBe(1);
    expect(queue.dequeue()).toBe(2);
    expect(queue.dequeue()).toBe(2);
    expect(queue.dequeue()).toBe(5);
    expect(queue.dequeue()).toBe(5);
    expect(queue.size).toBe(0);
  });

  it('should work with object types and a custom comparator', () => {
    const queue = new Queue<Item>(objectAsc);
    const itemA: Item = { value: 'A', priority: 10 };
    const itemB: Item = { value: 'B', priority: 5 };
    const itemC: Item = { value: 'C', priority: 15 };
    const itemD: Item = { value: 'D', priority: 3 };
    queue.enqueue(itemA, itemB, itemC, itemD);

    expect(queue.size).toBe(4);
    expect(queue.peek()?.value).toBe('D');
    expect(queue.dequeue()?.value).toBe('D');
    expect(queue.dequeue()?.value).toBe('B');
    expect(queue.dequeue()?.value).toBe('A');
    expect(queue.dequeue()?.value).toBe('C');
    expect(queue.size).toBe(0);
  });
});

describe('dequeue method', () => {
  it('should return undefined for an empty queue', () => {
    const queue = new Queue<number>(numberAsc);
    expect(queue.dequeue()).toBeUndefined();
    expect(queue.size).toBe(0);
    expect(queue.last).toBeUndefined();
  });

  it('should remove and return the root element (min-heap)', () => {
    const queue = new Queue<number>(numberAsc);
    queue.enqueue(10, 5, 15, 3, 7, 12);

    expect(queue.dequeue()).toBe(3);
    expect(queue.size).toBe(5);
    expect(queue.peek()).toBe(5);
    expect(queue.last).toBe(3);

    expect(queue.dequeue()).toBe(5);
    expect(queue.size).toBe(4);
    expect(queue.peek()).toBe(7);
    expect(queue.last).toBe(5);

    expect(swap).toHaveBeenCalled();
  });

  it('should handle dequeuing the last element', () => {
    const queue = new Queue<number>(numberAsc);
    queue.enqueue(10);

    expect(queue.dequeue()).toBe(10);
    expect(queue.size).toBe(0);
    expect(queue.last).toBe(10);
  });

  it('should handle dequeuing all elements', () => {
    const queue = new Queue<number>(numberAsc);
    queue.enqueue(5, 1, 8);

    expect(queue.dequeue()).toBe(1);
    expect(queue.dequeue()).toBe(5);
    expect(queue.dequeue()).toBe(8);
    expect(queue.dequeue()).toBeUndefined();
    expect(queue.size).toBe(0);
    expect(queue.last).toBe(8);
  });
});

describe('clear method', () => {
  it('should empty the queue', () => {
    const queue = new Queue<number>(numberAsc);
    queue.enqueue(1, 2, 3);
    expect(queue.size).toBe(3);

    queue.clear();
    expect(queue.size).toBe(0);
    expect(queue.peek()).toBeUndefined();
    expect(queue.last).toBeUndefined();
  });

  it('should do nothing on an already empty queue', () => {
    const queue = new Queue<number>(numberAsc);
    expect(queue.size).toBe(0);
    queue.clear();
    expect(queue.size).toBe(0);
  });
});

describe('find method', () => {
  const queue = new Queue<number>(numberAsc);

  beforeEach(() => {
    queue.clear();
    queue.enqueue(10, 5, 15, 3, 7, 12);
  });

  it('should return the first element that satisfies the predicate', () => {
    expect(queue.find((item: number) => item === 7)).toBe(7);
    expect(queue.find((item: number) => item > 10)).toBe(12);
  });

  it('should return undefined if no element satisfies the predicate', () => {
    expect(queue.find((item: number) => item === 99)).toBeUndefined();
    expect(queue.find((item: number) => item < 0)).toBeUndefined();
  });

  it('should work with complex objects', () => {
    const objQueue = new Queue<Item>(objectAsc);
    const item1: Item = { value: 'A', priority: 10 };
    const item2: Item = { value: 'B', priority: 5 };
    objQueue.enqueue(item1, item2);

    expect(objQueue.find((item: Item) => item.value === 'B')).toBe(item2);
  });
});

describe('update method', () => {
  let queue: Queue<number>;

  beforeEach(() => {
    queue = new Queue<number>(numberAsc);
    queue.enqueue(10, 5, 15, 3, 7, 12);
    vi.clearAllMocks();
  });

  it('should update an existing element and maintain heap property (decreasing value)', () => {
    const updated = queue.update((item: number) => item === 10, 2);

    expect(updated).toBe(2);
    expect(queue.size).toBe(6);
    expect(queue.peek()).toBe(2);
    expect(queue.dequeue()).toBe(2);
    expect(queue.dequeue()).toBe(3);
    expect(queue.dequeue()).toBe(5);
    expect(swap).toHaveBeenCalled();
  });

  it('should update an existing element and maintain heap property (increasing value)', () => {
    const updated = queue.update((item: number) => item === 3, 20);

    expect(updated).toBe(20);
    expect(queue.size).toBe(6);
    expect(queue.peek()).toBe(5);
    expect(queue.dequeue()).toBe(5);
    expect(queue.dequeue()).toBe(7);
    expect(queue.dequeue()).toBe(10);
    expect(queue.dequeue()).toBe(12);
    expect(queue.dequeue()).toBe(15);
    expect(queue.dequeue()).toBe(20);
    expect(swap).toHaveBeenCalled();
  });

  it('should return undefined if element not found and upsert is false', () => {
    const updated = queue.update((item: number) => item === 99, 100);

    expect(updated).toBeUndefined();
    expect(queue.size).toBe(6);
  });

  it('should enqueue a new element if not found and upsert is true', () => {
    const updated = queue.update((item: number) => item === 99, 1, true);

    expect(updated).toBe(1);
    expect(queue.size).toBe(7);
    expect(queue.peek()).toBe(1);
    expect(queue.dequeue()).toBe(1);
  });

  it('should handle object merging if both old and new values are object-like', () => {
    const objQueue = new Queue<Item>(objectAsc);
    const item1: Item = { value: 'A', priority: 10 };
    const item2: Item = { value: 'B', priority: 5 };
    objQueue.enqueue(item1, item2);

    const updatedValue: Item = { value: 'B_updated', priority: 2 };
    const updatedItem = objQueue.update((item: Item) => item.value === 'B', updatedValue);

    expect(updatedItem).toEqual({ value: 'B_updated', priority: 2 });
    expect(isObjectLike).toHaveBeenCalledWith(item2);
    expect(isObjectLike).toHaveBeenCalledWith(updatedValue);
    expect(objQueue.peek()?.value).toBe('B_updated');
    expect(objQueue.dequeue()?.value).toBe('B_updated');
    expect(objQueue.dequeue()?.value).toBe('A');
  });

  it('should perform deep merge manually', () => {
    const objQueue = new Queue<any>((a, b) => a.id - b.id);
    const item = { id: 1, data: { nested: 'old' } };
    objQueue.enqueue(item);

    const update = { data: { nested: 'new' } };
    objQueue.update((i) => i.id === 1, merge(item, update));

    expect(objQueue.peek()?.data.nested).toBe('new');
  });

  it('should replace element if old value is object-like but new is primitive', () => {
    const objQueue = new Queue<Item>(objectAsc);
    const item1: Item = { value: 'A', priority: 10 };
    const item2: Item = { value: 'B', priority: 5 };
    objQueue.enqueue(item1, item2);

    // @ts-expect-error: Testing update with a mismatched primitive type.
    const updatedItem = objQueue.update((item) => item.value === 'B', 99);

    expect(updatedItem).toBe(99);
    expect(isObjectLike).toHaveBeenCalledWith(item2);
    expect(isObjectLike).toHaveBeenCalledWith(99);
    expect(objQueue.peek()).toBe(99);
    expect(objQueue.dequeue()).toBe(99);
  });

  it('should replace element if old value is primitive but new is object-like', () => {
    const numQueue = new Queue<number | Item>(mixedAsc);
    numQueue.enqueue(10, 5);

    const updatedValue: Item = { value: 'NewObj', priority: 1 };
    const updatedItem = numQueue.update((item) => item === 5, updatedValue);

    expect(updatedItem).toBe(updatedValue);
    expect(isObjectLike).toHaveBeenCalledWith(5);
    expect(isObjectLike).not.toHaveBeenCalledWith(updatedValue);
    expect(numQueue.peek()).toBe(10);
    expect(numQueue.dequeue()).toBe(10);
    expect(numQueue.dequeue()).toBe(updatedValue);
  });
});

describe('delete method', () => {
  let queue: Queue<number>;

  beforeEach(() => {
    queue = new Queue<number>(numberAsc);
    queue.enqueue(10, 5, 15, 3, 7, 12);
    vi.clearAllMocks();
  });

  it('should remove an existing element and maintain heap property', () => {
    const removed = queue.delete((item: number) => item === 7);

    expect(removed).toBe(7);
    expect(queue.size).toBe(5);
    expect(queue.find((item: number) => item === 7)).toBeUndefined();
    expect(queue.dequeue()).toBe(3);
    expect(queue.dequeue()).toBe(5);
    expect(queue.dequeue()).toBe(10);
    expect(swap).toHaveBeenCalled();
  });

  it('should return undefined if element not found', () => {
    const removed = queue.delete((item: number) => item === 99);
    expect(removed).toBeUndefined();
    expect(queue.size).toBe(6);
  });

  it('should handle deleting the root element', () => {
    const removed = queue.delete((item: number) => item === 3);

    expect(removed).toBe(3);
    expect(queue.size).toBe(5);
    expect(queue.peek()).toBe(5);
    expect(swap).toHaveBeenCalled();
  });

  it('should handle deleting the last element in the heap array', () => {
    const removed = queue.delete((item: number) => item === 15);

    expect(removed).toBe(15);
    expect(queue.size).toBe(5);
    expect(queue.find((item: number) => item === 15)).toBeUndefined();
    expect(swap).not.toHaveBeenCalled();
  });

  it('should handle deleting from a queue with one element', () => {
    const singleQueue = new Queue<number>(numberAsc);
    singleQueue.enqueue(42);

    expect(singleQueue.delete((item: number) => item === 42)).toBe(42);
    expect(singleQueue.size).toBe(0);
    expect(singleQueue.peek()).toBeUndefined();
  });
});

describe('Symbol.iterator', () => {
  it('should iterate over all elements in min-heap order', () => {
    const queue = new Queue<number>(numberAsc);
    queue.enqueue(10, 5, 15, 3, 7, 12);

    const dequeuedElements: number[] = [];
    for (const item of queue) {
      dequeuedElements.push(item);
    }

    expect(dequeuedElements).toEqual([3, 5, 7, 10, 12, 15]);
    expect(queue.size).toBe(0);
  });

  it('should yield nothing for an empty queue', () => {
    const queue = new Queue<number>(numberAsc);
    const dequeuedElements: number[] = [];
    for (const item of queue) {
      dequeuedElements.push(item);
    }
    expect(dequeuedElements).toEqual([]);
    expect(queue.size).toBe(0);
  });

  it('should work with a queue of objects', () => {
    const queue = new Queue<Item>(objectAsc);
    queue.enqueue({ value: 'C', priority: 10 }, { value: 'A', priority: 5 }, { value: 'D', priority: 15 }, { value: 'B', priority: 3 });

    const dequeuedValues: string[] = [];
    for (const item of queue) {
      dequeuedValues.push(item.value);
    }

    expect(dequeuedValues).toEqual(['B', 'A', 'C', 'D']);
    expect(queue.size).toBe(0);
  });
});

describe('Heap property maintenance (indirect heapifyUp/Down tests)', () => {
  it('should maintain min-heap property after multiple enqueues and dequeues', () => {
    const queue = new Queue<number>(numberAsc);
    queue.enqueue(50, 30, 70, 10, 40, 60, 20);
    expect(queue.peek()).toBe(10);

    expect(queue.dequeue()).toBe(10);
    expect(queue.peek()).toBe(20);

    expect(queue.dequeue()).toBe(20);
    expect(queue.peek()).toBe(30);

    queue.enqueue(5);
    expect(queue.peek()).toBe(5);

    expect(queue.dequeue()).toBe(5);
    expect(queue.peek()).toBe(30);

    expect(queue.dequeue()).toBe(30);
    expect(queue.dequeue()).toBe(40);
    expect(queue.dequeue()).toBe(50);
    expect(queue.dequeue()).toBe(60);
    expect(queue.dequeue()).toBe(70);
    expect(queue.size).toBe(0);
  });

  it('should maintain heap property when updating an element to a smaller value (heapifyUp)', () => {
    const queue = new Queue<number>(numberAsc);
    queue.enqueue(10, 20, 30, 40, 50);
    expect(queue.peek()).toBe(10);

    queue.update((item: number) => item === 40, 5);

    expect(queue.peek()).toBe(5);
    expect(queue.dequeue()).toBe(5);
    expect(queue.dequeue()).toBe(10);
    expect(queue.dequeue()).toBe(20);
    expect(queue.dequeue()).toBe(30);
    expect(queue.dequeue()).toBe(50);
    expect(queue.size).toBe(0);
  });

  it('should maintain heap property when updating an element to a larger value (heapifyDown)', () => {
    const queue = new Queue<number>(numberAsc);
    queue.enqueue(10, 20, 30, 40, 50);
    expect(queue.peek()).toBe(10);

    queue.update((item: number) => item === 10, 100);

    expect(queue.peek()).toBe(20);
    expect(queue.dequeue()).toBe(20);
    expect(queue.dequeue()).toBe(30);
    expect(queue.dequeue()).toBe(40);
    expect(queue.dequeue()).toBe(50);
    expect(queue.dequeue()).toBe(100);
    expect(queue.size).toBe(0);
  });

  it('should maintain heap property when deleting an element (heapifyUp/Down)', () => {
    const queue = new Queue<number>(numberAsc);
    queue.enqueue(10, 5, 15, 3, 7, 12);
    expect(queue.peek()).toBe(3);

    queue.delete((item: number) => item === 5);

    expect(queue.size).toBe(5);
    expect(queue.peek()).toBe(3);
    expect(queue.dequeue()).toBe(3);
    expect(queue.dequeue()).toBe(7);
    expect(queue.dequeue()).toBe(10);
    expect(queue.dequeue()).toBe(12);
    expect(queue.dequeue()).toBe(15);
    expect(queue.size).toBe(0);
  });
});
