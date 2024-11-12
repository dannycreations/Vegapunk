import type { Comparator } from '../utils/comparators'

export class BSTree<T> {
	public constructor(protected compare: Comparator<T>) {}

	public get size(): number {
		return this.nodeCount
	}

	public min(node: BSTNode<T> | null = this.root): BSTNode<T> | null {
		while (node?.left) node = node.left
		return node
	}

	public max(node: BSTNode<T> | null = this.root): BSTNode<T> | null {
		while (node?.right) node = node.right
		return node
	}

	public insert(value: T): void {
		const node = new BSTNode(value)
		this.root = this.insertNode(this.root, node)
		this.nodeCount++
	}

	public search(value: T): BSTNode<T> | null {
		let current = this.root
		while (current) {
			const comp = this.compare(value, current.value)
			if (comp === 0) return current

			current = comp < 0 ? current.left : current.right
		}
		return null
	}

	public delete(value: T): void {
		const originalSize = this.size
		this.root = this.deleteNode(this.root, value)
		if (this.size < originalSize) this.nodeCount--
	}

	public *preOrderTraversal(): IterableIterator<T> {
		function* preOrder(node: BSTNode<T> | null): IterableIterator<T> {
			if (!node) return
			yield node.value
			yield* preOrder(node.left)
			yield* preOrder(node.right)
		}
		yield* preOrder(this.root)
	}

	public *inOrderTraversal(): IterableIterator<T> {
		function* inOrder(node: BSTNode<T> | null): IterableIterator<T> {
			if (!node) return
			yield* inOrder(node.left)
			yield node.value
			yield* inOrder(node.right)
		}
		yield* inOrder(this.root)
	}

	public *postOrderTraversal(): IterableIterator<T> {
		function* postOrder(node: BSTNode<T> | null): IterableIterator<T> {
			if (!node) return
			yield* postOrder(node.left)
			yield* postOrder(node.right)
			yield node.value
		}
		yield* postOrder(this.root)
	}

	protected insertNode(root: BSTNode<T> | null, node: BSTNode<T>): BSTNode<T> {
		if (!root) return node
		if (this.compare(node.value, root.value) < 0) {
			root.left = this.insertNode(root.left, node)
			root.left.parent = root
		} else {
			root.right = this.insertNode(root.right, node)
			root.right.parent = root
		}
		return root
	}

	protected deleteNode(root: BSTNode<T> | null, value: T): BSTNode<T> | null {
		if (!root) return null

		const comp = this.compare(value, root.value)
		if (comp < 0) {
			root.left = this.deleteNode(root.left, value)
		} else if (comp > 0) {
			root.right = this.deleteNode(root.right, value)
		} else {
			if (!root.left) return root.right
			if (!root.right) return root.left

			const successor = this.min(root.right)
			if (successor) {
				root.value = successor.value
				root.right = this.deleteNode(root.right, successor.value)
			}
		}
		return root
	}

	protected nodeCount = 0
	protected root: BSTNode<T> | null = null
}

export class BSTNode<T> {
	public left: BSTNode<T> | null = null
	public right: BSTNode<T> | null = null
	public parent: BSTNode<T> | null = null

	public constructor(public value: T) {}
}
