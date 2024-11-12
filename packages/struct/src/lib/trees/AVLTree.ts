import { BSTNode, BSTree } from './BSTree'

export class AVLTree<T> extends BSTree<T> {
	public override insert(value: T): void {
		const node = new AVLTNode(value)
		this.root = this.insertNode(this.root, node)
		this.nodeCount++
	}

	public override delete(value: T): void {
		const originalSize = this.size
		this.root = this.deleteNode(this.root, value)
		if (this.size < originalSize) this.nodeCount--
	}

	protected override insertNode(root: AVLTNode<T> | null, node: AVLTNode<T>): AVLTNode<T> {
		if (!root) return node
		if (this.compare(node.value, root.value) < 0) {
			root.left = this.insertNode(root.left, node)
		} else {
			root.right = this.insertNode(root.right, node)
		}

		this.updateHeight(root)
		return this.balance(root)
	}

	protected override deleteNode(root: AVLTNode<T> | null, value: T): AVLTNode<T> | null {
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

		this.updateHeight(root)
		return this.balance(root)
	}

	private updateHeight(node: AVLTNode<T>): void {
		node.height = 1 + Math.max(this.getHeight(node.left), this.getHeight(node.right))
	}

	private getHeight(node: AVLTNode<T> | null): number {
		return node?.height ?? 0
	}

	private getBalanceFactor(node: AVLTNode<T>): number {
		return this.getHeight(node.left) - this.getHeight(node.right)
	}

	private balance(node: AVLTNode<T>): AVLTNode<T> {
		const balanceFactor = this.getBalanceFactor(node)
		if (balanceFactor > 1) {
			if (this.getBalanceFactor(node.left!) < 0) {
				node.left = this.rotateLeft(node.left!)
			}
			return this.rotateRight(node)
		} else if (balanceFactor < -1) {
			if (this.getBalanceFactor(node.right!) > 0) {
				node.right = this.rotateRight(node.right!)
			}
			return this.rotateLeft(node)
		}
		return node
	}

	private rotateLeft(node: AVLTNode<T>): AVLTNode<T> {
		const newRoot = node.right!
		node.right = newRoot.left
		if (newRoot.left) newRoot.left.parent = node

		newRoot.left = node
		newRoot.parent = node.parent
		node.parent = newRoot

		this.updateHeight(node)
		this.updateHeight(newRoot)
		return newRoot
	}

	private rotateRight(node: AVLTNode<T>): AVLTNode<T> {
		const newRoot = node.left!
		node.left = newRoot.right
		if (newRoot.right) newRoot.right.parent = node

		newRoot.right = node
		newRoot.parent = node.parent
		node.parent = newRoot

		this.updateHeight(node)
		this.updateHeight(newRoot)
		return newRoot
	}

	protected override root: AVLTNode<T> | null = null
}

export class AVLTNode<T> extends BSTNode<T> {
	public override left: AVLTNode<T> | null = null
	public override right: AVLTNode<T> | null = null
	public override parent: AVLTNode<T> | null = null

	public height: number = 1
}
