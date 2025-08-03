import { createVitestConfig } from '../../scripts/vitest.config.js';
import { name } from './package.json';

export default createVitestConfig({ test: { name } }) as unknown;
