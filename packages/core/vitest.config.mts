import { createVitestConfig } from '../../scripts/vitest.config.mjs';
import { name } from './package.json';

export default createVitestConfig({ test: { name } }) as unknown;
