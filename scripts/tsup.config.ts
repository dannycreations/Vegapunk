import { relative, resolve } from 'node:path'
import { defineConfig, type Options } from 'tsup'

const baseOptions: Options = {
	dts: true,
	clean: true,
	minify: false,
	outDir: 'dist',
	sourcemap: true,
	keepNames: true,
	treeshake: true,
	target: 'es2020',
	entry: ['src/index.ts'],
	skipNodeModulesBundle: true,
	tsconfig: relative(__dirname, resolve(process.cwd(), 'tsconfig.json')),
}

export function createTsupConfig(options: Options = {}): unknown {
	return defineConfig({ ...baseOptions, format: 'cjs', ...options })
}
