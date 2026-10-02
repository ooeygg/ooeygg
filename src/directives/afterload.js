/* client:afterload — hydrate once the page has loaded and the main thread is idle,
   so heavy islands (the WebGL hero) never compete with first paint.
   Skips hydration entirely when WebGL would be software-rendered (no GPU, or a
   blocklisted driver): the scene would run at a few fps and freeze scrolling, so the
   static CSS poster stays instead — and the three.js chunk is never downloaded. */
function hasHardwareWebGL() {
  const canvas = document.createElement('canvas');
  const gl =
    canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ||
    canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true });
  if (!gl) return false;
  // Chrome doesn't always flag its SwiftShader fallback as a performance caveat.
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
}

export default async (load) => {
  if (!hasHardwareWebGL()) return;
  if (document.readyState !== 'complete') {
    await new Promise((resolve) => addEventListener('load', resolve, { once: true }));
  }
  await new Promise((resolve) =>
    'requestIdleCallback' in window ? requestIdleCallback(resolve, { timeout: 1500 }) : setTimeout(resolve, 200)
  );
  const hydrate = await load();
  await hydrate();
};
