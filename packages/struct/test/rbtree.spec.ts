import { beforeEach, describe, expect, it } from 'vitest'
import { ascend, RBTree } from '../dist'

describe('RedBlackTree', () => {
	let rbt: RBTree<number>

	beforeEach(() => (rbt = new RBTree(ascend)))

	describe('Insertion and Color/Balancing', () => {
		it('should insert nodes and maintain Red-Black properties', () => {
			rbt.insert(10)
			rbt.insert(20)
			rbt.insert(30)

			expect(rbt['root']!.color).toBe(1)
			expect(isBalanced(rbt['root'])).toBe(true)
		})

		it('should perform rotations and color flips to balance', () => {
			rbt.insert(10)
			rbt.insert(15)
			rbt.insert(7)
			rbt.insert(5)

			expect(isBalanced(rbt['root'])).toBe(true)
		})

		it('should keep the root black after multiple insertions', () => {
			const nodes = [20, 15, 25, 10, 18, 22, 30]
			nodes.forEach((node) => rbt.insert(node))

			expect(rbt['root']!.color).toBe(1)
			expect(isBalanced(rbt['root'])).toBe(true)
		})

		it('should not have consecutive red nodes (no red-red violation)', () => {
			const nodes = [10, 20, 30, 15, 25, 5, 2]
			nodes.forEach((node) => rbt.insert(node))

			expect(isBalanced(rbt['root'])).toBe(true)
		})
	})

	describe('Deletion and Color/Balancing', () => {
		beforeEach(() => {
			const nodes = [20, 15, 25, 10, 18, 22, 30]
			nodes.forEach((node) => rbt.insert(node))
		})

		it('should delete nodes and maintain Red-Black properties', () => {
			rbt.delete(15)
			expect(isBalanced(rbt['root'])).toBe(true)

			rbt.delete(20)
			expect(isBalanced(rbt['root'])).toBe(true)

			rbt.delete(30)
			expect(isBalanced(rbt['root'])).toBe(true)
		})

		it('should delete leaf nodes without violating properties', () => {
			rbt.delete(10)
			expect(isBalanced(rbt['root'])).toBe(true)

			rbt.delete(30)
			expect(isBalanced(rbt['root'])).toBe(true)
		})

		it('should handle deletion of root node', () => {
			rbt.delete(20)

			expect(rbt['root']!.color).toBe(1)
			expect(isBalanced(rbt['root'])).toBe(true)
		})

		it('should delete nodes and fix red-black violations with rotations and color adjustments', () => {
			rbt.delete(15)
			rbt.delete(18)

			expect(isBalanced(rbt['root'])).toBe(true)
		})
	})

	describe('Search', () => {
		it('should find existing values', () => {
			rbt.insert(10)
			rbt.insert(20)
			rbt.insert(30)

			const node = rbt.search(20)
			expect(node!.value).toBe(20)
		})

		it('should return null for non-existing values', () => {
			rbt.insert(10)
			rbt.insert(20)
			rbt.insert(30)

			const node = rbt.search(40)
			expect(node).toBeNull()
		})
	})

	describe('Minimum and Maximum', () => {
		it('should find the minimum value', () => {
			rbt.insert(10)
			rbt.insert(20)
			rbt.insert(5)

			const minNode = rbt.min()
			expect(minNode!.value).toBe(5)
		})

		it('should find the maximum value', () => {
			rbt.insert(10)
			rbt.insert(20)
			rbt.insert(30)

			const maxNode = rbt.max()
			expect(maxNode!.value).toBe(30)
		})

		it('should return null for minimum and maximum when tree is empty', () => {
			expect(rbt.min()).toBeNull()
			expect(rbt.max()).toBeNull()
		})
	})

	describe('Traversal', () => {
		beforeEach(() => {
			rbt.insert(10)
			rbt.insert(5)
			rbt.insert(20)
			rbt.insert(3)
			rbt.insert(7)
			rbt.insert(15)
			rbt.insert(30)
		})

		it('should perform in-order traversal', () => {
			const result: number[] = [...rbt.inOrderTraversal()]
			expect(result).toEqual([3, 5, 7, 10, 15, 20, 30])
		})

		it('should perform pre-order traversal', () => {
			const result: number[] = [...rbt.preOrderTraversal()]
			expect(result).toEqual([10, 5, 3, 7, 20, 15, 30])
		})

		it('should perform post-order traversal', () => {
			const result: number[] = [...rbt.postOrderTraversal()]
			expect(result).toEqual([3, 7, 5, 15, 30, 20, 10])
		})
	})
})

export enum Color {
	Red,
	Black,
}

function isBalanced(root: any): boolean {
	const checkProperties = (node: any, blackCount = 0, pathBlackCount = -1): boolean => {
		if (node === null) {
			return pathBlackCount === -1 || blackCount === pathBlackCount
		}

		if (node === root && node.color !== Color.Black) return false
		if (node.color === Color.Red) {
			if (node.left?.color === Color.Red || node.right?.color === Color.Red) return false
		}

		const newBlackCount = node.color === Color.Black ? blackCount + 1 : blackCount
		return checkProperties(node.left, newBlackCount, pathBlackCount) && checkProperties(node.right, newBlackCount, pathBlackCount)
	}
	return checkProperties(root)
}
