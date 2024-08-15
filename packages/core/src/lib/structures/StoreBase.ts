import { type Piece, type StoreRegistryKey, Store, VirtualPath } from '@sapphire/pieces'

export class StoreBase<T extends Piece, StoreName extends StoreRegistryKey> extends Store<T, StoreName> {
	public override async load(root: string, path: string) {
		if (root === VirtualPath) return []
		return super.load(root, path)
	}
}
