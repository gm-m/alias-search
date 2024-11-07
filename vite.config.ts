import { defineConfig } from 'vitest/config';
import webExtension, { readJsonFile } from "vite-plugin-web-extension";

function generateManifest() {
  const manifest = readJsonFile("src/manifest.json");
  const pkg = readJsonFile("package.json");
  return {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    ...manifest,
  };
}

export default defineConfig({
  plugins: [
    webExtension({
      manifest: generateManifest,
      watchFilePaths: ["package.json", "manifest.json"],
      browser: process.env.TARGET || "chrome",
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true
  }
});
