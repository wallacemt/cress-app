import { rolldown } from "rolldown";

// The AudioWorklet module can't go through Vite's normal `?worker&url` import:
// on this project's Rolldown-powered Vite, that combo doesn't invoke the
// worker-bundling pipeline at all -- it just copies the raw, untranspiled
// .ts source (confirmed by inspecting a real `vite build` output). Bundling
// it ourselves into a real static .js file under public/ sidesteps that
// entirely: Vite serves public/ untouched, with a correct .js extension and
// MIME type, in both `vite`/dev and `vite build`/production.
const bundle = await rolldown({
  input: "src/features/metronome/processor.ts",
  platform: "browser",
});
await bundle.write({ file: "public/metronome-processor.js", format: "esm" });
await bundle.close();
