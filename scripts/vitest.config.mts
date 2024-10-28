import { configDefaults, defineConfig, mergeConfig, ViteUserConfig } from 'vitest/config'
import { name } from '../package.json'

const baseOptions = {
	test: {
		name,
		include: ['test/*.{test,spec}.{ts,mts,cts}'],
		exclude: [...configDefaults.exclude],
		watch: false,
		testTimeout: 10_000,
	},
} satisfies ViteUserConfig

export function createVitestConfig(options: ViteUserConfig = {}): unknown {
	return defineConfig(mergeConfig(baseOptions, options))
}
