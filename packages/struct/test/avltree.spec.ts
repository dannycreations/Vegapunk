import { beforeEach, describe, expect, it } from 'vitest'
import { ascend, AVLTree } from '../dist'

describe('AVLTree', () => {
	let avl: AVLTree<number>

	beforeEach(() => (avl = new AVLTree(ascend)))

	describe('Insertion and Balancing', () => {
		it('should insert nodes and maintain AVL balance', () => {
			avl.insert(10)
			avl.insert(20)
			avl.insert(30)

			expect(avl['root']!.value).toBe(20)
			expect(avl['root']!.left!.value).toBe(10)
			expect(avl['root']!.right!.value).toBe(30)
		})

		it('should perform left rotation', () => {
			avl.insert(10)
			avl.insert(20)
			avl.insert(30)

			expect(avl['root']!.value).toBe(20)
		})

		it('should perform right rotation', () => {
			avl.insert(30)
			avl.insert(20)
			avl.insert(10)

			expect(avl['root']!.value).toBe(20)
		})

		it('should perform left-right rotation', () => {
			avl.insert(30)
			avl.insert(10)
			avl.insert(20)

			expect(avl['root']!.value).toBe(20)
			expect(avl['root']!.left!.value).toBe(10)
			expect(avl['root']!.right!.value).toBe(30)
		})

		it('should perform right-left rotation', () => {
			avl.insert(10)
			avl.insert(30)
			avl.insert(20)

			expect(avl['root']!.value).toBe(20)
			expect(avl['root']!.left!.value).toBe(10)
			expect(avl['root']!.right!.value).toBe(30)
		})

		it('should maintain balance with multiple insertions', () => {
			const keys = [10, 20, 30, 40, 50, 25]
			keys.forEach((key) => avl.insert(key))

			expect(avl['root']!.value).toBe(30)
			expect(avl['root']!.left!.value).toBe(20)
			expect(avl['root']!.right!.value).toBe(40)
			expect(avl['root']!.left!.left!.value).toBe(10)
			expect(avl['root']!.left!.right!.value).toBe(25)
			expect(avl['root']!.right!.right!.value).toBe(50)
		})
	})

	describe('Deletion and Balancing', () => {
		beforeEach(() => {
			const keys = [10, 20, 30, 40, 50, 25]
			keys.forEach((key) => avl.insert(key))
		})

		it('should delete leaf nodes and maintain balance', () => {
			avl.delete(10)
			expect(avl['root']!.left!.left).toBeNull()

			avl.delete(50)
			expect(avl['root']!.right!.right).toBeNull()
		})

		it('should delete nodes with one child and maintain balance', () => {
			avl.delete(40)
			expect(avl['root']!.value).toBe(30)
			expect(avl['root']!.right!.value).toBe(50)
		})

		it('should delete nodes with two children and maintain balance', () => {
			avl.delete(20)
			expect(avl['root']!.left!.value).toBe(25)
			expect(avl['root']!.value).toBe(30)
			expect(avl['root']!.left!.left!.value).toBe(10)
		})

		it('should maintain AVL balance after multiple deletions', () => {
			avl.delete(10)
			avl.delete(20)
			avl.delete(30)

			expect(avl['root']!.value).toBe(40)
			expect(avl['root']!.left!.value).toBe(25)
			expect(avl['root']!.right!.value).toBe(50)
		})
	})

	describe('Search', () => {
		it('should find existing values', () => {
			avl.insert(10)
			avl.insert(20)
			avl.insert(30)

			const node = avl.search(20)
			expect(node!.value).toBe(20)
		})

		it('should return null for non-existing values', () => {
			avl.insert(10)
			avl.insert(20)
			avl.insert(30)

			const node = avl.search(40)
			expect(node).toBeNull()
		})
	})

	describe('Minimum and Maximum', () => {
		it('should find the minimum value', () => {
			avl.insert(10)
			avl.insert(20)
			avl.insert(5)

			const minNode = avl.min()
			expect(minNode!.value).toBe(5)
		})

		it('should find the maximum value', () => {
			avl.insert(10)
			avl.insert(20)
			avl.insert(30)

			const maxNode = avl.max()
			expect(maxNode!.value).toBe(30)
		})

		it('should return null for minimum and maximum when tree is empty', () => {
			expect(avl.min()).toBeNull()
			expect(avl.max()).toBeNull()
		})
	})

	describe('Traversal', () => {
		beforeEach(() => {
			avl.insert(10)
			avl.insert(5)
			avl.insert(20)
			avl.insert(3)
			avl.insert(7)
			avl.insert(15)
			avl.insert(30)
		})

		it('should perform in-order traversal', () => {
			const result: number[] = [...avl.inOrderTraversal()]
			expect(result).toEqual([3, 5, 7, 10, 15, 20, 30])
		})

		it('should perform pre-order traversal', () => {
			const result: number[] = [...avl.preOrderTraversal()]
			expect(result).toEqual([10, 5, 3, 7, 20, 15, 30])
		})

		it('should perform post-order traversal', () => {
			const result: number[] = [...avl.postOrderTraversal()]
			expect(result).toEqual([3, 7, 5, 15, 30, 20, 10])
		})
	})
})
