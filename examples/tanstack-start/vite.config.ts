import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = import.meta.dirname;
const permixRoot = path.join(root, "../../permix/src");

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "permix/react": path.join(permixRoot, "react/index.ts"),
      "permix/tanstack-start": path.join(permixRoot, "tanstack-start/index.ts"),
      permix: path.join(permixRoot, "core/index.ts"),
    },
  },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
});
