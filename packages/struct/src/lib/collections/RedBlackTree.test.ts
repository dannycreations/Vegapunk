import { beforeEach, describe, expect, it } from 'vitest';

import { RedBlackTree } from './RedBlackTree';

describe('RedBlackTree', () => {
  let tree: RedBlackTree<number>;

  beforeEach(() => {
    tree = new RedBlackTree<number>((a, b) => a - b);
  });

  describe('constructor', () => {
    it('should create an empty tree', () => {
      expect(tree.size).toBe(0);
      expect(tree.has(10)).toBe(false);
    });

    it('should accept a custom comparator', () => {
      const reverseTree = new RedBlackTree<number>((a, b) => b - a);
      reverseTree.add(1);
      reverseTree.add(2);
      const iterator = reverseTree[Symbol.iterator]();
      expect(iterator.next().value).toBe(2);
      expect(iterator.next().value).toBe(1);
    });
  });

  describe('add', () => {
    it('should add elements and increase size', () => {
      expect(tree.add(10)).toBe(true);
      expect(tree.size).toBe(1);
      expect(tree.has(10)).toBe(true);

      expect(tree.add(5)).toBe(true);
      expect(tree.size).toBe(2);
      expect(tree.has(5)).toBe(true);
    });

    it('should not add duplicate elements', () => {
      tree.add(10);
      expect(tree.add(10)).toBe(false);
      expect(tree.size).toBe(1);
    });

    it('should handle large number of insertions', () => {
      const count = 1000;
      for (let i = 0; i < count; i++) {
        tree.add(i);
      }
      expect(tree.size).toBe(count);
      for (let i = 0; i < count; i++) {
        expect(tree.has(i)).toBe(true);
      }
    });
  });

  describe('has', () => {
    it('should return true for existing elements', () => {
      tree.add(10);
      expect(tree.has(10)).toBe(true);
    });

    it('should return false for non-existing elements', () => {
      tree.add(10);
      expect(tree.has(5)).toBe(false);
    });
  });

  describe('delete', () => {
    it('should remove existing elements and decrease size', () => {
      tree.add(10);
      tree.add(5);

      expect(tree.delete(10)).toBe(true);
      expect(tree.size).toBe(1);
      expect(tree.has(10)).toBe(false);
      expect(tree.has(5)).toBe(true);
    });

    it('should return false when removing non-existing elements', () => {
      tree.add(10);
      expect(tree.delete(5)).toBe(false);
      expect(tree.size).toBe(1);
    });

    it('should handle root deletion', () => {
      tree.add(10);
      expect(tree.delete(10)).toBe(true);
      expect(tree.size).toBe(0);
      expect(tree.has(10)).toBe(false);
    });

    it('should handle complex deletions', () => {
      // Insert enough nodes to cause rotations and color changes
      const nodes = [10, 5, 15, 3, 7, 12, 17, 1, 4, 6, 8, 11, 13, 16, 18];
      nodes.forEach((n) => tree.add(n));

      expect(tree.size).toBe(nodes.length);

      // Delete in a way that might trigger different cases
      expect(tree.delete(15)).toBe(true); // Node with two children
      expect(tree.delete(3)).toBe(true); // Node with two children
      expect(tree.delete(1)).toBe(true); // Leaf

      expect(tree.size).toBe(nodes.length - 3);
      expect(tree.has(15)).toBe(false);
      expect(tree.has(3)).toBe(false);
      expect(tree.has(1)).toBe(false);

      // Verify remaining
      [10, 5, 7, 12, 17, 4, 6, 8, 11, 13, 16, 18].forEach((n) => {
        expect(tree.has(n)).toBe(true);
      });
    });
  });

  describe('clear', () => {
    it('should remove all elements', () => {
      tree.add(1);
      tree.add(2);
      tree.clear();
      expect(tree.size).toBe(0);
      expect(tree.has(1)).toBe(false);
    });
  });

  describe('iterator', () => {
    it('should iterate elements in sorted order', () => {
      tree.add(10);
      tree.add(5);
      tree.add(15);
      tree.add(3);
      tree.add(7);

      const result = [...tree];
      expect(result).toEqual([3, 5, 7, 10, 15]);
    });

    it('should handle empty tree', () => {
      expect([...tree]).toEqual([]);
    });
  });
});
