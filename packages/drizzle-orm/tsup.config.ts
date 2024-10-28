import { esbuildPluginFilePathExtensions } from 'esbuild-plugin-file-path-extensions'
import { createTsupConfig } from '../../scripts/tsup.config'

export default createTsupConfig({
	bundle: true,
	entry: ['src/**/index.ts'],
	esbuildPlugins: [esbuildPluginFilePathExtensions()],
}) as unknown
