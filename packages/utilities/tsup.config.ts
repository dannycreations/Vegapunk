import { createTsupConfig } from '../../scripts/tsup.config';

export default createTsupConfig({
  entry: ['src/index.ts', 'src/lib/std/*.ts'],
}) as unknown;
