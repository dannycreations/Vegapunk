import { Store, VirtualPath } from '@sapphire/pieces';

import type { Piece, StoreRegistryKey } from '@sapphire/pieces';

export const HookPath = '::hook::';

export class StoreBase<T extends Piece, StoreName extends StoreRegistryKey> extends Store<T, StoreName> {
  public override async load(root: string, path: string): Promise<T[]> {
    if ([HookPath, VirtualPath].includes(root)) {
      return [];
    }

    return super.load(root, path);
  }
}
