// Page-wide water: calm glacier light near the surface that deepens to teal in the dive band.
// Soft, slow, low-contrast: broad light patches and a few rays, never lines.
import { shaderCanvas } from './gl.js';

const FRAG = `
uniform vec2 uRes; uniform float uTime, uDepth, uFlow;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = .5; for (int i = 0; i < 4; i++){ v += a*n(p); p = p*2.02 + 3.7; a *= .5; } return v; }
void main(){
  vec2 suv = gl_FragCoord.xy / uRes, uv = gl_FragCoord.xy / uRes.y;
  float t = uTime * .02 + uFlow;
  // broad, blurry light patches drifting slowly (soft caustic feel, no sharp edges)
  float light = fbm(uv * 1.6 + vec2(t, -t * .6) + fbm(uv * 1.2 - t) * .8);
  light = smoothstep(.45, .85, light);
  // gentle slanted rays from the surface
  float ray = sin((suv.x * 1.2 + suv.y * .45) * 9.0 + uTime * .12) * .5 + .5;
  ray = smoothstep(.7, 1.0, ray) * smoothstep(.25, 1.0, suv.y);
  vec3 top = vec3(.176, .302, .314), mid = vec3(.137, .255, .259), low = vec3(.106, .204, .212);
  vec3 surf = mix(low, mix(mid, top, smoothstep(.5, 1.0, suv.y)), smoothstep(0.0, .5, suv.y));
  vec3 deep = mix(vec3(.047, .110, .118), vec3(.078, .157, .169), suv.y);
  vec3 col = mix(surf, deep, uDepth);
  col += vec3(.62, .92, .90) * light * mix(.07, .05, uDepth);
  col += vec3(.75, .95, .95) * ray * mix(.06, .03, uDepth);
  gl_FragColor = vec4(col, 1.0);
}`;

export function water(canvas, { reduce }) {
  const s = shaderCanvas(canvas, FRAG, { maxDpr: .75, alpha: false });
  if (!s) { canvas.remove(); return { setDepth() {} }; }
  let depth = 0, depthTarget = 0, flow = 0, last = performance.now(), lastY = scrollY;
  addEventListener('resize', () => s.resize());
  addEventListener('scroll', () => { flow += (scrollY - lastY) * .00015; lastY = scrollY; }, { passive: true });
  function frame(t) {
    const dt = Math.min(64, t - last); last = t;
    depth += (depthTarget - depth) * Math.min(1, dt / 260);
    s.draw((gl, u) => { gl.uniform1f(u('uTime'), reduce ? 0 : t / 1000); gl.uniform1f(u('uDepth'), depth); gl.uniform1f(u('uFlow'), flow); });
    if (!reduce || Math.abs(depthTarget - depth) > .002) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { setDepth(v) { const was = depthTarget; depthTarget = v; if (reduce && Math.abs(was - v) > .001) requestAnimationFrame(frame); } };
}
