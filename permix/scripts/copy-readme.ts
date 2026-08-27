import fs from "node:fs";
import path from "node:path";

const currentDir = import.meta.dirname;
const readmePath = path.join(currentDir, "../..", "README.md");
const distReadmePath = path.join(currentDir, "..", "README.md");

fs.copyFileSync(readmePath, distReadmePath);
