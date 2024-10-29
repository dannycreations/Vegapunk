import { getTableColumns, Table } from 'drizzle-orm'

export function getColumnName<T extends Table>(table: T, key: unknown): string {
	return getTableColumns(table)[String(key)].name
}

export function reverseCase(input: string): string {
	return input.includes('_') ? snakeToCamel(input) : camelToSnake(input)
}

function snakeToCamel(str: string): string {
	return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

function camelToSnake(str: string): string {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase()
}
