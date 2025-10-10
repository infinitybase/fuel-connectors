import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: {
    only: true,
  },
  clean: true,
  treeshake: false,
  sourcemap: false,
  format: ['esm', 'cjs'],
  external: ['fuels', '@fuel-connectors/bako-predicate-connector'],
});
