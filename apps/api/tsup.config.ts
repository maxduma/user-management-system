import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Bundle the workspace package (it ships TypeScript sources); keep real
  // npm dependencies external so they are resolved from node_modules.
  noExternal: ['@ums/shared'],
});
