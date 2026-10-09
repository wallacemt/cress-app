import { cpSync, mkdirSync } from "node:fs";
for (const name of ["wasm", "cmaps", "standard_fonts"]) {
  const from = `node_modules/pdfjs-dist/${name}`;
  const to = `public/pdfjs/${name}`;
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}
