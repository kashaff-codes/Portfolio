// The signature blob: one soft, cloud-like liquid shape. Its outline breathes with slow noise, colour flows
// inside it like marbled liquid, and it's lit like glossy glass. It bulges away from the cursor and turns
// as the page scrolls.
import { shaderCanvas } from './gl.js';

const FRAG = `
uniform vec2 uRes; uniform float uTime, uSpin, uGrain;
uniform vec2 uMouse;
uniform vec3 uA, uB, uC, uD, uShade;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = .5; for (int i = 0; i < 5; i++){ v += a*n(p); p = mat2(1.6,1.2,-1.2,1.6)*p + 5.3; a *= .5; } return v; }
float soft(vec2 p){ return n(p) * .65 + n(p * 1.9 + 3.1) * .35; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float smin(float a, float b, float k){ float h = clamp(.5 + .5*(b-a)/k, 0.0, 1.0); return mix(b, a, h) - k*h*(1.0-h); }
// one lobe: a circle whose radius breathes with noise sampled around the angle (seamless)
float lobe(vec2 p, vec2 c, float R, float seed, float t){
  vec2 d = p - c; float a = atan(d.y, d.x);
  vec2 ring = vec2(cos(a), sin(a)) * 1.1 + seed;
  float wob = (soft(ring * .9 + vec2(t * .1, -t * .08)) - .5) * .3;
  return length(d) - R * (1.0 + wob);
}
float shape(vec2 p, float t){
  p = rot(uSpin) * p;
  float d = lobe(p, vec2(0.0), .62, 1.7, t);
  d = smin(d, lobe(p, vec2(cos(t*.21)*.26, sin(t*.17)*.2 + .12), .42, 4.1, t), .28);
  d = smin(d, lobe(p, vec2(sin(t*.15)*-.3, cos(t*.19)*.16 - .14), .38, 7.9, t), .28);
  return d;
}
void main(){
  vec2 px = gl_FragCoord.xy;
  vec2 p = (px - .5 * uRes) / (.5 * min(uRes.x, uRes.y));   // -1..1 across the shorter side
  float t = uTime;
  // the cursor presses a soft dent into the surface
  vec2 m = (uMouse - .5 * uRes) / (.5 * min(uRes.x, uRes.y));
  vec2 dm = p - m; p += dm * .22 * exp(-dot(dm, dm) * 6.0);
  float d = shape(p, t);
  float pxw = 2.0 / min(uRes.x, uRes.y);
  float alpha = smoothstep(pxw * 1.5, -pxw * 1.5, d);
  if (alpha <= 0.0) { gl_FragColor = vec4(0.0); return; }
  // dome normal from the distance field
  vec2 e = vec2(.03, 0.0);
  vec2 g = vec2(shape(p + e.xy, t) - shape(p - e.xy, t), shape(p + e.yx, t) - shape(p - e.yx, t));
  float inside = clamp(-d / .5, 0.0, 1.0);
  float dome = sqrt(1.0 - (1.0 - inside) * (1.0 - inside));
  vec3 nrm = normalize(vec3(normalize(g + 1e-5) * (1.0 - dome) * 1.6, .2 + dome));
  // marbled liquid flowing inside
  vec2 q = rot(-uSpin * .6) * p * 1.35;
  float w1 = fbm(q * 1.4 + vec2(t * .07, -t * .05));
  float w2 = fbm(q * 1.8 + w1 * 2.4 + vec2(-t * .05, t * .06));
  float flow = fbm(q * 1.2 + w2 * 2.6 + t * .04);
  float bands = .5 + .5 * sin(flow * 6.0 + t * .5);
  vec3 col = mix(uA, uB, smoothstep(.25, .65, flow));
  col = mix(col, uC, smoothstep(.45, .85, w2) * .8);
  col = mix(col, uD, smoothstep(.62, .95, bands * flow * 1.6) * .55);
  // glossy light
  vec3 L = normalize(vec3(-.5, .65, .6)), V = vec3(0, 0, 1);
  float diff = .62 + .38 * dot(nrm, L);
  float spec = pow(max(dot(reflect(-L, nrm), V), 0.0), 48.0);
  float spec2 = pow(max(dot(reflect(-normalize(vec3(.6, -.4, .7)), nrm), V), 0.0), 18.0) * .25;
  float rim = pow(1.0 - nrm.z, 2.2);
  col = col * diff;
  col = mix(col, uShade, rim * .35);
  col += vec3(1.0) * (spec * .85 + spec2);
  col += uD * rim * .25;
  col += (h(px + floor(t * 8.0)) - .5) * uGrain;                 // fine film grain, not stipple
  gl_FragColor = vec4(col * alpha, alpha);
}`;

const hex = h => h.match(/\w\w/g).map(x => parseInt(x, 16) / 255);

export function blob(canvas, { reduce, palette, grain = .045 }) {
  const s = shaderCanvas(canvas, FRAG, { maxDpr: innerWidth < 820 ? 1 : 1.25 });
  if (!s) { canvas.remove(); return { setSpin() {} }; }
  addEventListener('resize', () => s.resize());
  let mx = -1e5, my = -1e5, tmx = -1e5, tmy = -1e5, spin = 0;
  addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    tmx = (e.clientX - r.left) * (canvas.width / r.width); tmy = (r.bottom - e.clientY) * (canvas.height / r.height);
    if (mx < -1e4) { mx = tmx; my = tmy; }
  }, { passive: true });
  const [A, B, C, D, S] = palette.map(hex);
  const draw = t => {
    mx += (tmx - mx) * .08; my += (tmy - my) * .08;
    s.draw((gl, u) => {
      gl.uniform1f(u('uTime'), reduce ? 4 : t / 1000); gl.uniform1f(u('uSpin'), spin); gl.uniform1f(u('uGrain'), grain);
      gl.uniform2f(u('uMouse'), mx, my);
      gl.uniform3fv(u('uA'), A); gl.uniform3fv(u('uB'), B); gl.uniform3fv(u('uC'), C); gl.uniform3fv(u('uD'), D); gl.uniform3fv(u('uShade'), S);
    });
  };
  let on = false, raf = 0;
  const loop = t => { draw(t); if (on) raf = requestAnimationFrame(loop); };
  if (reduce) draw(0);
  else new IntersectionObserver(([e]) => { if (e.isIntersecting && !on) { on = true; raf = requestAnimationFrame(loop); } else if (!e.isIntersecting) { on = false; cancelAnimationFrame(raf); } }, { rootMargin: '120px' }).observe(canvas);
  return { setSpin(v) { spin = v; if (reduce) draw(0); } };
}
