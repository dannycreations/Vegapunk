import { container, VirtualPath, type Piece } from '@sapphire/pieces'
import { TaskBase } from './internal/TaskBase'

export abstract class Task<Options extends Task.Options = Task.Options> extends TaskBase<Options> {
	public static createTask(piece: CreateTask) {
		const _piece = { ...piece, options: { enabled: true, ...piece.options } }

		const id = `${VirtualPath}${Date.now()}`
		const context = { name: id, root: id, path: id, store: null }
		const task = new TaskBase(context, { ...piece.options, enabled: true }) as Task

		if (typeof _piece.awake === 'function') task['awake'] = _piece.awake.bind(_piece.awake)
		if (typeof _piece.start === 'function') task['start'] = _piece.start.bind(_piece.start)
		if (typeof _piece.update === 'function') task['update'] = _piece.update.bind(_piece.update)
		if (typeof _piece.options.delay === 'number') task.setDelay(_piece.options.delay)
		if (_piece.options.enabled) task['_isEnable'] = _piece.options.enabled
		container.stores.get('tasks').set(task.name, task)

		task['_update'](true)
		return task
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
