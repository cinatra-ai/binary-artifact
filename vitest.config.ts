import { defineConfig } from "vitest/config";

// jsdom so the renderer can mount into a real DOM and assert on the emitted
// download card and its attributes. The automatic JSX runtime matches the
// tsconfig `jsx: "react-jsx"`.
export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
