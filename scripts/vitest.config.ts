import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';
import { DefaultReporter } from 'vitest/reporters';

import { name } from '../package.json';

import type { ViteUserConfig } from 'vitest/config';
import type { Vitest } from 'vitest/node';

class ErrorReporter extends DefaultReporter {
  override onInit(ctx: Vitest): void {
    this.ctx = ctx;
    this.ctx.logger.printNoTestFound = () => {};
  }

  override printTestModule(): void {}
}

const baseOptions = {
  test: {
    name,
    reporters: [new ErrorReporter()],
    include: ['src/**/*.{test,spec}.{ts,mts,cts}'],
    exclude: [...configDefaults.exclude],
    watch: false,
    testTimeout: 10_000,
    passWithNoTests: true,
  },
} satisfies ViteUserConfig;

export function createVitestConfig(options: ViteUserConfig = {}): unknown {
  return defineConfig(mergeConfig(baseOptions, options));
}
