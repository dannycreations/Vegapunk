import { container, type Piece } from '@sapphire/pieces'
import { HookPath } from './internal/StoreBase'
import { TaskBase } from './internal/TaskBase'

export abstract class Task<Options extends Task.Options = Task.Options> extends TaskBase<Options> {
	public static createTask(task: CreateTask) {
		const _task = { ...task, options: { enabled: true, ...task.options } }

		const taskStores = container.stores.get('tasks')
		const context = { name: `${HookPath}${Date.now()}`, root: HookPath, path: HookPath, store: taskStores }
		const piece = new TaskBase(context, { ..._task.options, enabled: true }) as Task

		if (typeof _task.awake === 'function') piece['awake'] = _task.awake.bind(_task.awake)
		if (typeof _task.start === 'function') piece['start'] = _task.start.bind(_task.start)
		if (typeof _task.update === 'function') piece['update'] = _task.update.bind(_task.update)
		if (typeof _task.options.delay === 'number') piece.setDelay(_task.options.delay)
		if (typeof _task.options.enabled === 'boolean') piece['_isEnable'] = _task.options.enabled
		taskStores.set(piece.name, piece)

		piece['_start'](true).then(() => piece['_update']())
		return piece
	}

	public constructor(context: Task.LoaderContext, options: Options = {} as Options) {
		super(context, { ...options, name: options.name ?? context.name })

		if (typeof options.delay === 'number') this.setDelay(options.delay)
	}

	public awake?(): unknown
	public start?(): unknown
	public abstract update(): unknown
}

export interface CreateTask {
	awake?(): unknown
	start?(): unknown
	update(): unknown
	options?: Task.Options
}

export interface TaskOptions extends Piece.Options {
	readonly delay?: number
}

export namespace Task {
	export type Options = TaskOptions
	export type LoaderContext = Piece.LoaderContext<'tasks'>
}
