// Liquid glass droplets that drift over the name. The name is drawn into a texture; inside a droplet it is
// magnified and bent like text seen through water, with a soap-film rainbow on the rim and glossy highlights.
import { shaderCanvas } from './gl.js';

const FRAG = `
uniform vec2 uRes; uniform float uTime, uSpin, uHasText;
uniform sampler2D uText;
uniform vec3 uB0, uB1;          // droplet centres (px) and radii (px)
uniform vec2 uMouse;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
float soft(vec2 p){ return n(p) * .65 + n(p * 1.9 + 3.1) * .35; }
float smin(float a, float b, float k){ float hh = clamp(.5 + .5*(b-a)/k, 0.0, 1.0); return mix(b, a, hh) - k*hh*(1.0-hh); }
float lobe(vec2 p, vec3 b, float seed){
  vec2 d = p - b.xy + vec2(1e-3, 0.0); float a = atan(d.y, d.x) + uSpin;   // never atan(0, 0)
  vec2 ring = vec2(cos(a), sin(a)) * .9 + seed;
  return length(d) - b.z * (1.0 + (soft(ring + vec2(uTime * .12, -uTime * .1)) - .5) * .22);
}
float field(vec2 p){ return smin(lobe(p, uB0, 1.3), lobe(p, uB1, 6.1), uB0.z * .45); }
vec4 txt(vec2 px){ vec2 uv = px / uRes; return uHasText > .5 ? texture2D(uText, uv) : vec4(0.0); }
void main(){
  vec2 p = gl_FragCoord.xy;
  vec2 dm = p - uMouse; float R = uB0.z;
  vec2 q = p + dm * .16 * exp(-dot(dm, dm) / (R * R * .25));   // the cursor presses a soft dent
  float d = field(q);
  vec4 base = txt(p);
  float aa = smoothstep(1.5, -1.5, d);
  // light bent through the drop lands as a faint caustic glow just outside its edge
  vec3 halo = vec3(.41, .85, .96) * exp(-max(d, 0.0) / (R * .12)) * .10 * (1.0 - aa);
  if (aa <= 0.0) { gl_FragColor = vec4(base.rgb + halo, max(base.a, length(halo))); return; }
  vec2 e = vec2(2.0, 0.0);
  vec2 g = vec2(field(q + e.xy) - field(q - e.xy), field(q + e.yx) - field(q - e.yx));
  float depth = clamp(-d / (R * .55), 0.0, 1.0), dome = sqrt(max(1.0 - (1.0 - depth) * (1.0 - depth), 0.0));
  vec3 nrm = normalize(vec3(normalize(g + 1e-5) * (1.0 - dome) * 1.5, .25 + dome));
  // which droplet are we in? magnify toward its centre and bend along the surface
  vec2 c = lobe(q, uB0, 1.3) < lobe(q, uB1, 6.1) ? uB0.xy : uB1.xy;
  vec2 look = c + (p - c) * .8 - nrm.xy * R * .16;
  vec4 r = txt(look + nrm.xy * 3.0), gg = txt(look), b = txt(look - nrm.xy * 3.0);   // slight chromatic split
  vec3 seen = vec3(r.r, gg.g, b.b); float seenA = max(max(r.a, gg.a), b.a);
  // soap-film rainbow on the rim, glossy highlights
  float fres = pow(clamp(1.0 - nrm.z, 0.0, 1.0), 2.2);   // clamp: rounding can push z past 1 and pow() of a negative is NaN
  float hue = fres * 1.6 + uTime * .06 + p.y / uRes.y * .8;
  vec3 film = .5 + .5 * cos(6.2831 * (hue + vec3(0.0, .33, .67)));
  film = mix(film, vec3(.41, .85, .96), .25);
  vec3 L = normalize(vec3(-.5, .7, .55)), V = vec3(0, 0, 1);
  float spec = pow(clamp(dot(reflect(-L, nrm), V), 0.0, 1.0), 60.0);
  float spec2 = pow(clamp(dot(reflect(-normalize(vec3(.55, -.6, .6)), nrm), V), 0.0, 1.0), 22.0) * .3;
  vec3 col = seen * (1.0 - .08 * fres) + vec3(.62, .9, .95) * .07 + film * fres * .85 + vec3(1.0) * (spec * .95 + spec2);
  float a = clamp(max(seenA, .1 + fres * .75) + spec + spec2 * .5, 0.0, 1.0);
  vec4 inside = vec4(min(col, vec3(1.0)), a);
  vec4 outside = vec4(base.rgb + halo, max(base.a, length(halo)));
  gl_FragColor = mix(outside, inside, aa);
}`;

export function lens(canvas, { reduce, textEls = [], drops }) {
  let dirty = true;
  const s = shaderCanvas(canvas, FRAG, { maxDpr: innerWidth < 820 ? 1.25 : 1.5, onResize: () => { dirty = true; } });
  if (!s) return null;
  const { gl } = s;
  // the name as a texture
  const tex = gl.createTexture(), tc = document.createElement('canvas'), tctx = tc.getContext('2d');
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  function paintText() {
    if (!textEls.length) return;
    tc.width = canvas.width; tc.height = canvas.height;
    const cr = canvas.getBoundingClientRect();
    tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.clearRect(0, 0, tc.width, tc.height);
    tctx.setTransform(canvas.width / cr.width, 0, 0, canvas.height / cr.height, 0, 0);   // work in CSS pixels
    for (const el of textEls) {
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      const size = parseFloat(cs.fontSize), ls = parseFloat(cs.letterSpacing) || 0;
      tctx.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`; tctx.fillStyle = el.dataset.color || cs.color; tctx.textBaseline = 'alphabetic';
      // baseline exactly as CSS lays out a line: half-leading above the font's ascent
      const m = tctx.measureText('KF'), asc = m.fontBoundingBoxAscent || size * .8, desc = m.fontBoundingBoxDescent || size * .2;
      const y = (r.top - cr.top) + (r.height - (asc + desc)) / 2 + asc;
      let x = (r.left - cr.left) + (parseFloat(cs.paddingLeft) || 0);
      const text = el.dataset.text || el.textContent.trim();
      // place each letter after the measured run before it, so kerning pairs (like A–T) match the page
      const chars = [...text];
      chars.forEach((ch, i) => tctx.fillText(ch, x + tctx.measureText(chars.slice(0, i).join('')).width + i * ls, y));
    }
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tc);
  }
  let mx = -1e5, my = -1e5, tmx = -1e5, tmy = -1e5, spin = 0;
  addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect(), k = canvas.width / r.width;
    tmx = (e.clientX - r.left) * k; tmy = (r.bottom - e.clientY) * k; if (mx < -1e4) { mx = tmx; my = tmy; }
  }, { passive: true });
  addEventListener('resize', () => { s.resize(); dirty = true; });
  const state = { c0: [0, 0, 1], c1: [0, 0, 1] };
  const draw = t => {
    if (dirty) { paintText(); dirty = false; }
    mx += (tmx - mx) * .08; my += (tmy - my) * .08;
    const W = canvas.width, H = canvas.height, time = reduce ? 3 : t / 1000;
    const D = drops(W, H, time);           // caller decides where the droplets drift
    state.c0 = D[0]; state.c1 = D[1];
    s.draw((g, u) => {
      g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, tex); g.uniform1i(u('uText'), 0);
      g.uniform1f(u('uHasText'), textEls.length ? 1 : 0);
      g.uniform1f(u('uTime'), time); g.uniform1f(u('uSpin'), spin);
      g.uniform3f(u('uB0'), ...D[0]); g.uniform3f(u('uB1'), ...D[1]); g.uniform2f(u('uMouse'), mx, my);
    });
  };
  let on = false, raf = 0;
  const loop = t => { draw(t); if (on) raf = requestAnimationFrame(loop); };
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  fontsReady.then(() => {
    dirty = true;
    if (reduce) draw(0);
    else new IntersectionObserver(([e]) => { if (e.isIntersecting && !on) { on = true; raf = requestAnimationFrame(loop); } else if (!e.isIntersecting) { on = false; cancelAnimationFrame(raf); } }, { rootMargin: '120px' }).observe(canvas);
  });
  return {
    repaint() { dirty = true; if (reduce) draw(0); },
    setSpin(v) { spin = v; },
    // where the main droplet is, in page (client) coordinates, for the fish to swim around
    box() {
      const r = canvas.getBoundingClientRect(), kx = canvas.width / r.width, ky = canvas.height / r.height, [x, y, rad] = state.c0;
      const cx = r.left + x / kx, cy = r.bottom - y / ky, R = rad / kx;
      return { left: cx - R, top: cy - R, width: 2 * R, height: 2 * R };
    },
  };
}
