import { createTsupConfig } from '../../scripts/tsup.config'

export default createTsupConfig({
	bundle: false,
	entry: ['src/**/*.ts'],
}) as unknown
