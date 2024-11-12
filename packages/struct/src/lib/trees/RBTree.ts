import { BSTNode, BSTree } from './BSTree'

export class RBTree<T> extends BSTree<T> {
	public override insert(key: T): void {
		let node = new RBTNode(key)
		this.root = this.insertNode(this.root, node) as RBTNode<T>
		node.color = Color.Red

		while (node.parent?.color === Color.Red) {
			const parent = node.parent
			const grandparent = parent.parent

			if (grandparent && parent === grandparent.left) {
				const uncle = grandparent.right
				if (uncle?.color === Color.Red) {
					parent.color = Color.Black
					uncle.color = Color.Black
					grandparent.color = Color.Red
					node = grandparent
				} else {
					if (node === parent.right) {
						node = parent
						this.rotateLeft(node)
					}

					parent.color = Color.Black
					grandparent.color = Color.Red
					this.rotateRight(grandparent)
				}
			} else if (grandparent) {
				const uncle = grandparent.left
				if (uncle?.color === Color.Red) {
					parent.color = Color.Black
					uncle.color = Color.Black
					grandparent.color = Color.Red
					node = grandparent
				} else {
					if (node === parent.left) {
						node = parent
						this.rotateRight(node)
					}

					parent.color = Color.Black
					grandparent.color = Color.Red
					this.rotateLeft(grandparent)
				}
			}
		}

		this.root!.color = Color.Black
		this.nodeCount++
	}

	private rotateLeft(node: RBTNode<T>): void {
		const rightChild = node.right!
		node.right = rightChild.left

		if (rightChild.left) rightChild.left.parent = node
		rightChild.parent = node.parent

		if (!node.parent) {
			this.root = rightChild
		} else if (node === node.parent.left) {
			node.parent.left = rightChild
		} else {
			node.parent.right = rightChild
		}

		rightChild.left = node
		node.parent = rightChild
	}

	private rotateRight(node: RBTNode<T>): void {
		const leftChild = node.left!
		node.left = leftChild.right

		if (leftChild.right) leftChild.right.parent = node
		leftChild.parent = node.parent

		if (!node.parent) {
			this.root = leftChild
		} else if (node === node.parent.right) {
			node.parent.right = leftChild
		} else {
			node.parent.left = leftChild
		}

		leftChild.right = node
		node.parent = leftChild
	}

	protected override root: RBTNode<T> | null = null
}

export class RBTNode<T> extends BSTNode<T> {
	public override left: RBTNode<T> | null = null
	public override right: RBTNode<T> | null = null
	public override parent: RBTNode<T> | null = null

	public color: Color = Color.Red
}

export enum Color {
	Red,
	Black,
}
