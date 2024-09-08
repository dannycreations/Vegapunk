import { LoaderStrategy } from '@sapphire/pieces'
import { type Task } from './Task'
import { type TaskStore } from './TaskStore'

export class TaskLoaderStrategy extends LoaderStrategy<Task> {
	public override async onLoad(_store: TaskStore, piece: Task) {
		await piece['_start'](true)
		return piece['_update']()
	}

	public override onUnload(_store: TaskStore, piece: Task) {
		piece.stopTask()
	}
}
