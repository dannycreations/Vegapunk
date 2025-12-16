import type { Comparator } from '@vegapunk/utilities';

const RED = true;
const BLACK = false;

/**
 * Represents a node within the Red-Black Tree.
 *
 * @template T The type of value stored in the node.
 */
class Node<T> {
  /** The value stored in the node. */
  public value: T;
  /** The color of the node (RED or BLACK). */
  public color: boolean;
  /** A reference to the left child node. */
  public left: Node<T> | null;
  /** A reference to the right child node. */
  public right: Node<T> | null;
  /** A reference to the parent node. */
  public parent: Node<T> | null;

  /**
   * Creates an instance of a Node.
   *
   * @param {T} value The value to store in the node.
   * @param {boolean=} [color=RED] The color of the node.
   * @param {Node<T> | null=} [parent=null] A reference to the parent node.
   */
  public constructor(value: T, color: boolean = RED, parent: Node<T> | null = null) {
    this.value = value;
    this.color = color;
    this.left = null;
    this.right = null;
    this.parent = parent;
  }
}

/**
 * A Red-Black Tree is a self-balancing binary search tree that maintains its balance
 * by adhering to a set of rules, ensuring that operations like insertion, deletion,
 * and search have a worst-case time complexity of O(log n).
 *
 * @template T The type of values stored in the tree.
 */
export class RedBlackTree<T> {
  protected readonly compare: Comparator<T>;
  protected root: Node<T> | null = null;
  protected _size: number = 0;

  /**
   * Creates an instance of a RedBlackTree.
   *
   * @example
   * ```typescript
   * // Create a tree for numbers
   * const numberTree = new RedBlackTree<number>((a, b) => a - b);
   *
   * // Create a tree for strings (default comparison)
   * const stringTree = new RedBlackTree<string>();
   * ```
   *
   * @param {Comparator<T>=} [compare=() => 0] A function that defines the sort
   *   order. It should return a negative value if `a` < `b`, a positive value
   *   if `a` > `b`, and zero if `a` === `b`.
   */
  public constructor(compare: Comparator<T> = () => 0) {
    this.compare = compare;
  }

  /**
   * Gets the number of elements in the tree.
   *
   * @example
   * ```typescript
   * const tree = new RedBlackTree<number>();
   * tree.add(10);
   * tree.add(20);
   * console.log(tree.size); // Output: 2
   * ```
   *
   * @returns {number} The number of elements.
   */
  public get size(): number {
    return this._size;
  }

  /**
   * Removes all elements from the tree.
   *
   * @example
   * ```typescript
   * const tree = new RedBlackTree<number>((a, b) => a - b);
   * tree.add(10);
   * tree.add(20);
   * tree.clear();
   * console.log(tree.size); // Output: 0
   * ```
   *
   * @returns {void}
   */
  public clear(): void {
    this.root = null;
    this._size = 0;
  }

  /**
   * Checks if a value exists in the tree.
   *
   * @example
   * ```typescript
   * const tree = new RedBlackTree<number>((a, b) => a - b);
   * tree.add(10);
   * console.log(tree.has(10)); // Output: true
   * console.log(tree.has(20)); // Output: false
   * ```
   *
   * @param {T} value The value to check for.
   * @returns {boolean} `true` if the value exists, `false` otherwise.
   */
  public has(value: T): boolean {
    let current = this.root;
    while (current !== null) {
      const cmp = this.compare(value, current.value);
      if (cmp === 0) {
        return true;
      }
      current = cmp < 0 ? current.left : current.right;
    }
    return false;
  }

  /**
   * Adds a new value to the tree. The tree remains balanced after the insertion.
   *
   * @example
   * ```typescript
   * const tree = new RedBlackTree<number>((a, b) => a - b);
   * const added = tree.add(10);
   * console.log(added); // Output: true
   *
   * const notAdded = tree.add(10); // Value already exists
   * console.log(notAdded); // Output: false
   * ```
   *
   * @param {T} value The value to add to the tree.
   * @returns {boolean} `true` if the value was added successfully, `false` if
   *   the value already exists in the tree.
   */
  public add(value: T): boolean {
    if (this.root === null) {
      this.root = new Node(value, BLACK);
      this._size++;
      return true;
    }

    let parent: Node<T> | null = null;
    let current: Node<T> | null = this.root;
    let cmp = 0;

    while (current !== null) {
      cmp = this.compare(value, current.value);
      if (cmp === 0) {
        return false;
      }
      parent = current;
      current = cmp < 0 ? current.left : current.right;
    }

    const newNode = new Node(value, RED, parent);
    if (cmp < 0) {
      parent!.left = newNode;
    } else {
      parent!.right = newNode;
    }

    this.fixInsertion(newNode);
    this._size++;
    return true;
  }

  /**
   * Deletes a value from the tree. The tree remains balanced after the deletion.
   *
   * @example
   * ```typescript
   * const tree = new RedBlackTree<number>((a, b) => a - b);
   * tree.add(10);
   * tree.add(20);
   *
   * const deleted = tree.delete(10);
   * console.log(deleted); // Output: true
   *
   * const notDeleted = tree.delete(30); // Value does not exist
   * console.log(notDeleted); // Output: false
   * ```
   *
   * @param {T} value The value to delete from the tree.
   * @returns {boolean} `true` if the value was found and deleted, `false` otherwise.
   */
  public delete(value: T): boolean {
    let node = this.root;
    while (node !== null) {
      const cmp = this.compare(value, node.value);
      if (cmp === 0) {
        break;
      }
      node = cmp < 0 ? node.left : node.right;
    }

    if (node === null) {
      return false;
    }

    this.deleteNode(node);
    this._size--;
    return true;
  }

  /**
   * Returns an iterator that yields all values in the tree in ascending order.
   *
   * @example
   * ```typescript
   * const tree = new RedBlackTree<number>((a, b) => a - b);
   * tree.add(20);
   * tree.add(10);
   * tree.add(30);
   *
   * for (const value of tree) {
   *   console.log(value);
   * }
   * // Output:
   * // 10
   * // 20
   * // 30
   * ```
   *
   * @returns {IterableIterator<T>} An iterator for the tree's values.
   */
  public *[Symbol.iterator](): IterableIterator<T> {
    if (this.root === null) {
      return;
    }

    const stack: Node<T>[] = [];
    let current: Node<T> | null = this.root;

    while (current !== null || stack.length > 0) {
      while (current !== null) {
        stack.push(current);
        current = current.left;
      }

      current = stack.pop()!;
      yield current.value;
      current = current.right;
    }
  }

  /**
   * Performs a left rotation on the given node.
   *
   * @param {Node<T>} node The node to rotate.
   * @returns {void}
   */
  protected rotateLeft(node: Node<T>): void {
    const rightChild = node.right!;
    node.right = rightChild.left;

    if (rightChild.left !== null) {
      rightChild.left.parent = node;
    }

    rightChild.parent = node.parent;

    if (node.parent === null) {
      this.root = rightChild;
    } else if (node === node.parent.left) {
      node.parent.left = rightChild;
    } else {
      node.parent.right = rightChild;
    }

    rightChild.left = node;
    node.parent = rightChild;
  }

  /**
   * Performs a right rotation on the given node.
   *
   * @param {Node<T>} node The node to rotate.
   * @returns {void}
   */
  protected rotateRight(node: Node<T>): void {
    const leftChild = node.left!;
    node.left = leftChild.right;

    if (leftChild.right !== null) {
      leftChild.right.parent = node;
    }

    leftChild.parent = node.parent;

    if (node.parent === null) {
      this.root = leftChild;
    } else if (node === node.parent.right) {
      node.parent.right = leftChild;
    } else {
      node.parent.left = leftChild;
    }

    leftChild.right = node;
    node.parent = leftChild;
  }

  /**
   * Restores the Red-Black Tree properties after a node insertion.
   *
   * @param {Node<T>} node The newly inserted node.
   * @returns {void}
   */
  protected fixInsertion(node: Node<T>): void {
    let current = node;

    while (current.parent !== null && current.parent.color === RED) {
      const grandparent = current.parent.parent!;

      if (current.parent === grandparent.left) {
        const uncle = grandparent.right;

        if (uncle !== null && uncle.color === RED) {
          current.parent.color = BLACK;
          uncle.color = BLACK;
          grandparent.color = RED;
          current = grandparent;
        } else {
          if (current === current.parent.right) {
            current = current.parent;
            this.rotateLeft(current);
          }
          current.parent!.color = BLACK;
          grandparent.color = RED;
          this.rotateRight(grandparent);
        }
      } else {
        const uncle = grandparent.left;

        if (uncle !== null && uncle.color === RED) {
          current.parent.color = BLACK;
          uncle.color = BLACK;
          grandparent.color = RED;
          current = grandparent;
        } else {
          if (current === current.parent.left) {
            current = current.parent;
            this.rotateRight(current);
          }
          current.parent!.color = BLACK;
          grandparent.color = RED;
          this.rotateLeft(grandparent);
        }
      }
    }

    this.root!.color = BLACK;
  }

  /**
   * Handles the internal logic of deleting a node from the tree.
   *
   * @param {Node<T>} z The node to be deleted.
   * @returns {void}
   */
  protected deleteNode(z: Node<T>): void {
    let y = z;
    let yOriginalColor = y.color;
    let x: Node<T> | null;
    let xParent: Node<T> | null;

    if (z.left === null) {
      x = z.right;
      xParent = z.parent;
      this.transplant(z, z.right);
    } else if (z.right === null) {
      x = z.left;
      xParent = z.parent;
      this.transplant(z, z.left);
    } else {
      y = this.minimum(z.right);
      yOriginalColor = y.color;
      x = y.right;

      if (y.parent === z) {
        xParent = y;
      } else {
        xParent = y.parent;
        this.transplant(y, y.right);
        y.right = z.right;
        y.right!.parent = y;
      }

      this.transplant(z, y);
      y.left = z.left;
      y.left!.parent = y;
      y.color = z.color;
    }

    if (yOriginalColor === BLACK) {
      this.fixDeletion(x, xParent);
    }
  }

  /**
   * Replaces one subtree as a child of its parent with another subtree.
   *
   * @param {Node<T>} u The node to be replaced.
   * @param {Node<T> | null} v The node to replace `u` with.
   * @returns {void}
   */
  protected transplant(u: Node<T>, v: Node<T> | null): void {
    if (u.parent === null) {
      this.root = v;
    } else if (u === u.parent.left) {
      u.parent.left = v;
    } else {
      u.parent.right = v;
    }
    if (v !== null) {
      v.parent = u.parent;
    }
  }

  /**
   * Finds the node with the minimum value in a subtree.
   *
   * @param {Node<T>} node The root of the subtree to search.
   * @returns {Node<T>} The node with the minimum value.
   */
  protected minimum(node: Node<T>): Node<T> {
    let current = node;
    while (current.left !== null) {
      current = current.left;
    }
    return current;
  }

  /**
   * Restores the Red-Black Tree properties after a node deletion.
   *
   * @param {Node<T> | null} x The node that requires rebalancing.
   * @param {Node<T> | null} xParent The parent of the node `x`.
   * @returns {void}
   */
  protected fixDeletion(x: Node<T> | null, xParent: Node<T> | null): void {
    let current = x;
    let parent = xParent;

    while (current !== this.root && (current === null || current.color === BLACK)) {
      if (parent === null) break;

      if (current === parent.left) {
        let sibling = parent.right;

        if (sibling !== null && sibling.color === RED) {
          sibling.color = BLACK;
          parent.color = RED;
          this.rotateLeft(parent);
          sibling = parent.right;
        }

        if (sibling === null) {
          current = parent;
          parent = current.parent;
        } else if ((sibling.left === null || sibling.left.color === BLACK) && (sibling.right === null || sibling.right.color === BLACK)) {
          sibling.color = RED;
          current = parent;
          parent = current.parent;
        } else {
          if (sibling.right === null || sibling.right.color === BLACK) {
            if (sibling.left !== null) sibling.left.color = BLACK;
            sibling.color = RED;
            this.rotateRight(sibling);
            sibling = parent.right!;
          }

          sibling.color = parent.color;
          parent.color = BLACK;
          if (sibling.right !== null) sibling.right.color = BLACK;
          this.rotateLeft(parent);
          current = this.root;
          parent = null;
        }
      } else {
        let sibling = parent.left;

        if (sibling !== null && sibling.color === RED) {
          sibling.color = BLACK;
          parent.color = RED;
          this.rotateRight(parent);
          sibling = parent.left;
        }

        if (sibling === null) {
          current = parent;
          parent = current.parent;
        } else if ((sibling.right === null || sibling.right.color === BLACK) && (sibling.left === null || sibling.left.color === BLACK)) {
          sibling.color = RED;
          current = parent;
          parent = current.parent;
        } else {
          if (sibling.left === null || sibling.left.color === BLACK) {
            if (sibling.right !== null) sibling.right.color = BLACK;
            sibling.color = RED;
            this.rotateLeft(sibling);
            sibling = parent.left!;
          }

          sibling.color = parent.color;
          parent.color = BLACK;
          if (sibling.left !== null) sibling.left.color = BLACK;
          this.rotateRight(parent);
          current = this.root;
          parent = null;
        }
      }
    }

    if (current !== null) {
      current.color = BLACK;
    }
  }
}
