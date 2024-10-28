import { createTsupConfig } from '../../scripts/tsup.config'

export default createTsupConfig({ entry: ['src/**/index.ts'] }) as unknown
