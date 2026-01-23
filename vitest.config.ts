import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    alias: {
      // Mock the @opencode-ai/plugin module to avoid ESM resolution issues
      // The plugin has a bug where index.js exports from "./tool" without .js extension
      "@opencode-ai/plugin": new URL(
        "./src/__mocks__/@opencode-ai/plugin.ts",
        import.meta.url
      ).pathname,
    },
  },
})
