// Tiny WebGL helper: one full-screen triangle and a fragment shader.
const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

export function shaderCanvas(canvas, frag, { maxDpr = 1.5, alpha = true, onResize } = {}) {
  const gl = canvas.getContext('webgl', { alpha, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const compile = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, 'precision highp float;\n' + frag);
  if (!vs || !fs) return null;
  const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(prog)); return null; }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const cache = {};
  const u = name => (name in cache ? cache[name] : (cache[name] = gl.getUniformLocation(prog, name)));
  let dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  if (window.ResizeObserver) new ResizeObserver(() => { const w = canvas.width, h = canvas.height; resize(); if ((w !== canvas.width || h !== canvas.height) && onResize) onResize(); }).observe(canvas);
  return {
    gl, u, resize, get dpr() { return dpr; },
    draw(set) { gl.useProgram(prog); gl.uniform2f(u('uRes'), canvas.width, canvas.height); set && set(gl, u); gl.drawArrays(gl.TRIANGLES, 0, 3); },
  };
}

// Runs fn(t) every frame only while the element is on screen and the tab is visible.
export function whenVisible(el, fn) {
  let on = false, raf = 0;
  const loop = t => { fn(t); raf = requestAnimationFrame(loop); };
  const start = () => { if (!on) { on = true; raf = requestAnimationFrame(loop); } };
  const stop = () => { on = false; cancelAnimationFrame(raf); };
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: '100px' }).observe(el);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : null));
  return { start, stop };
}
