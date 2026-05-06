import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    sourcemap: true,
  },
  {
    entry: ["src/cli.ts"],
    format: ["cjs"],
    dts: false,
    clean: false,
    sourcemap: false,
    // Shebang so the bin file is directly executable.
    banner: { js: "#!/usr/bin/env node" },
  },
]);
