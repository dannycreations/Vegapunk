import { beforeEach, describe, expect, it } from 'vitest'
import { ascend, BSTree } from '../dist'

describe('BinarySearchTree', () => {
	let bst: BSTree<number>

	beforeEach(() => (bst = new BSTree(ascend)))

	describe('Insert', () => {
		it('should insert nodes correctly', () => {
			bst.insert(10)
			bst.insert(5)
			bst.insert(15)

			expect(bst['root']!.value).toBe(10)
			expect(bst['root']!.left!.value).toBe(5)
			expect(bst['root']!.right!.value).toBe(15)
		})

		it('should handle duplicate values correctly', () => {
			bst.insert(10)
			bst.insert(10)
			bst.insert(10)

			expect(bst['root']!.value).toBe(10)
			expect(bst['root']!.right!.value).toBe(10)
			expect(bst['root']!.right!.right!.value).toBe(10)
		})
	})

	describe('Search', () => {
		it('should find existing values', () => {
			bst.insert(10)
			bst.insert(5)
			bst.insert(15)

			const node = bst.search(5)
			expect(node!.value).toBe(5)
		})

		it('should return null for non-existing values', () => {
			bst.insert(10)
			bst.insert(5)
			bst.insert(15)

			const node = bst.search(20)
			expect(node).toBeNull()
		})
	})

	describe('Delete', () => {
		it('should delete leaf nodes', () => {
			bst.insert(10)
			bst.insert(5)
			bst.insert(15)

			bst.delete(5)

			expect(bst['root']!.left).toBeNull()
		})

		it('should delete nodes with one child', () => {
			bst.insert(10)
			bst.insert(5)
			bst.insert(15)
			bst.insert(3)

			bst.delete(5)

			expect(bst['root']!.left!.value).toBe(3)
		})

		it('should delete nodes with two children', () => {
			bst.insert(10)
			bst.insert(5)
			bst.insert(15)
			bst.insert(12)
			bst.insert(17)

			bst.delete(15)

			expect(bst['root']!.right!.value).toBe(17)
			expect(bst['root']!.right!.left!.value).toBe(12)
		})

		it('should handle deletion of root node', () => {
			bst.insert(10)
			bst.insert(5)
			bst.insert(15)

			bst.delete(10)

			expect(bst['root']!.value).toBe(15)
			expect(bst['root']!.left!.value).toBe(5)
		})
	})

	describe('Minimum and Maximum', () => {
		it('should find the minimum value', () => {
			bst.insert(10)
			bst.insert(5)
			bst.insert(15)
			bst.insert(2)

			const minNode = bst.min()
			expect(minNode!.value).toBe(2)
		})

		it('should find the maximum value', () => {
			bst.insert(10)
			bst.insert(5)
			bst.insert(15)
			bst.insert(20)

			const maxNode = bst.max()
			expect(maxNode!.value).toBe(20)
		})

		it('should return null for minimum and maximum when tree is empty', () => {
			expect(bst.min()).toBeNull()
			expect(bst.max()).toBeNull()
		})
	})

	describe('Traversal', () => {
		beforeEach(() => {
			bst.insert(10)
			bst.insert(5)
			bst.insert(15)
			bst.insert(3)
			bst.insert(7)
			bst.insert(12)
			bst.insert(18)
		})

		it('should perform in-order traversal', () => {
			const result: number[] = [...bst.inOrderTraversal()]
			expect(result).toEqual([3, 5, 7, 10, 12, 15, 18])
		})

		it('should perform pre-order traversal', () => {
			const result: number[] = [...bst.preOrderTraversal()]
			expect(result).toEqual([10, 5, 3, 7, 15, 12, 18])
		})

		it('should perform post-order traversal', () => {
			const result: number[] = [...bst.postOrderTraversal()]
			expect(result).toEqual([3, 7, 5, 12, 18, 15, 10])
		})
	})
})
