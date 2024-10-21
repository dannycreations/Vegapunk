import { configDefaults, defineConfig, mergeConfig, ViteUserConfig } from 'vitest/config'
import { name } from '../package.json'

const baseOptions: ViteUserConfig = {
	test: {
		name,
		include: ['test/*.{test,spec}.{ts,mts,cts}'],
		exclude: [...configDefaults.exclude],
		watch: false,
	},
}

export function createVitestConfig(options: ViteUserConfig = {}): unknown {
	return defineConfig(mergeConfig(baseOptions, options))
}
