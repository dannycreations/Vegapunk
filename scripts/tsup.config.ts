import { relative, resolve } from 'node:path'
import { defineConfig, type Options } from 'tsup'

const baseOptions = {
	dts: true,
	clean: true,
	format: 'cjs',
	minify: false,
	outDir: 'dist',
	sourcemap: true,
	keepNames: true,
	treeshake: true,
	target: 'es2020',
	entry: ['src/index.ts'],
	skipNodeModulesBundle: true,
	tsconfig: relative(__dirname, resolve(process.cwd(), 'tsconfig.json')),
} satisfies Options

export function createTsupConfig(options: Options = {}): unknown {
	return defineConfig({ ...baseOptions, ...options })
}
