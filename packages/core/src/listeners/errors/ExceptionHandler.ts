import { container } from '@sapphire/pieces';

import { Listener } from '../../lib/structures/Listener';

export class CoreListener extends Listener<'internalException'> {
  public constructor(context: Listener.LoaderContext) {
    super(context, {
      event: 'internalException',
      enabled: container.client.options.internalException,
    });
  }

  public run(error: Error, _origin: string): void {
    this.container.logger.fatal(error, `Encountered error on event "${this.event.toString()}"`);
  }
}

void container.stores.loadPiece({
  store: 'listeners',
  name: 'InternalException',
  piece: CoreListener,
});
