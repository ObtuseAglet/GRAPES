import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['core/**/*.test.ts', 'lib/**/*.test.ts', 'features/**/*.test.ts'],
    environment: 'node',
  },
});
