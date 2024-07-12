import { relative, resolve as resolveDir } from 'node:path'
import { defineConfig, type Options } from 'tsup'

const baseOptions: Options = {
	clean: true,
	dts: true,
	entry: ['src/index.ts'],
	minify: false,
	skipNodeModulesBundle: true,
	sourcemap: true,
	target: 'es2020',
	tsconfig: relative(__dirname, resolveDir(process.cwd(), 'tsconfig.json')),
	keepNames: true,
	treeshake: true,
}

export function createTsupConfig(options: Options = {}) {
	return defineConfig({
		...baseOptions,
		outDir: 'dist',
		format: 'cjs',
		...options,
	})
}
