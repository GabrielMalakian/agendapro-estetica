import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // resolve os aliases `@/*` do tsconfig.json
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
