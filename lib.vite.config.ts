import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, readdirSync, statSync } from 'fs';

function findWasmFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = resolve(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      findWasmFiles(fullPath, files);
    } else if (entry.endsWith('.wasm')) {
      files.push(fullPath);
    }
  }
  return files;
}

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'GameTemplate',
      fileName: (format) => `game-template.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    },
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild'
  },
  plugins: [
    {
      name: 'copy-wasm',
      writeBundle() {
        const srcDir = resolve(__dirname, 'src');
        const wasmFiles = findWasmFiles(srcDir);
        for (const wasmFile of wasmFiles) {
          const fileName = wasmFile.split('/').pop();
          const destPath = resolve(__dirname, 'dist', fileName!);
          copyFileSync(wasmFile, destPath);
          console.log(`Copied ${fileName} to dist/`);
        }
      }
    }
  ]
});
