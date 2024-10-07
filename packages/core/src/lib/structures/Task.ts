import { container, type Piece } from '@sapphire/pieces'
import { VegapunkSnowflake } from '@vegapunk/utilities'
import { HookPath } from './internal/StoreBase'
import { TaskBase } from './internal/TaskBase'
import { TaskStore } from './TaskStore'

export abstract class Task<Options extends Task.Options = Task.Options> extends TaskBase<Options> {
	public static readonly MinDelay = 20
	public static readonly MaxDelay = 2147483647

	public static async createTask(task: CreateTask) {
		const _task = { ...task, options: { enabled: true, ...task.options } }

		let taskStores = container.stores.get('tasks')
		if (!taskStores) {
			container.stores.register(new TaskStore())
			taskStores = container.stores.get('tasks')
		}

		const uniq = VegapunkSnowflake.generate({ processId: BigInt(taskStores.size) })
		const context = { name: `${HookPath}${uniq}`, root: HookPath, path: HookPath, store: taskStores }
		const piece = new TaskBase(context, { ..._task.options, enabled: true }) as Task

		const previous = taskStores.get(piece.name)
		if (previous) await previous.unload()

		piece['_isEnable'] = _task.options.enabled
		if (typeof _task.awake === 'function') piece.awake = _task.awake.bind(_task.awake)
		if (typeof _task.start === 'function') piece.start = _task.start.bind(_task.start)
		if (typeof _task.update === 'function') piece.update = _task.update.bind(_task.update)
		await taskStores.strategy.onLoad(taskStores, piece)

		taskStores.set(piece.name, piece)
		return piece
	}

	public abstract override update(): unknown
}

export interface CreateTask {
	awake?(): unknown
	start?(): unknown
	update(): unknown
	options?: Task.Options
}

export interface TaskOptions extends Piece.Options {
	readonly delay?: number
	readonly ref?: boolean
}

export namespace Task {
	export type Options = TaskOptions
	export type LoaderContext = Piece.LoaderContext<'tasks'>
}
