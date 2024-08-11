import { Listener } from './Listener'
import { ListenerLoaderStrategy } from './ListenerLoaderStrategy'
import { StoreBase } from './StoreBase'

export class ListenerStore extends StoreBase<Listener, 'listeners'> {
	public constructor() {
		super(Listener, {
			name: 'listeners',
			strategy: new ListenerLoaderStrategy(),
		})
	}
}
