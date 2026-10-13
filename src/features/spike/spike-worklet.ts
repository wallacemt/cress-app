export async function loadClickWorklet() {
  const ctx = new AudioContext();
  await ctx.audioWorklet.addModule(
    new URL("./click-processor.ts?worker&url", import.meta.url),
  );
  return ctx;
}
