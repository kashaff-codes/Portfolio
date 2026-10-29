import { water } from './water.js?v=19';
import { lens } from './lens.js?v=19';
import { sea as life } from './sea.js?v=19';
import { school } from './school.js?v=19';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = p => 1 - Math.pow(1 - p, 3);
document.documentElement.classList.add('motion');

const sea = water(document.getElementById('water'), { reduce });
const water2 = life(document.getElementById('sea'), { reduce });

/* ---------- Toast ---------- */
const toast = document.getElementById('toast');
let toastTimer;
function celebrate() {
  toast.classList.add('show'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 5200);
  document.querySelector('.hunt')?.classList.add('done');
}

/* ---------- Hero: liquid glass drifting over the name, and a school of fish around it ---------- */
const nameEl = document.querySelector('.name'), lensCanvas = document.getElementById('lens'), schoolCanvas = document.getElementById('school');
const nameLines = [...document.querySelectorAll('.name > span')];
let nameBox = null, t0 = null;
const measureName = () => {
  // the box around the letters themselves (each line is sized to its text)
  const cr = lensCanvas.getBoundingClientRect(), kx = lensCanvas.width / cr.width, ky = lensCanvas.height / cr.height;
  const rs = nameLines.map(n => n.getBoundingClientRect());
  const l = Math.min(...rs.map(r => r.left)), r = Math.max(...rs.map(r => r.right)), t = Math.min(...rs.map(r => r.top)), b = Math.max(...rs.map(r => r.bottom));
  nameBox = { x: (l - cr.left) * kx, y: (cr.bottom - b) * ky, w: (r - l) * kx, h: (b - t) * ky };
};
let home = null, popped = -1;
const heroLens = lens(lensCanvas, {
  reduce,
  drops(W, H, t) {
    measureName();
    const { x, y, w, h } = nameBox, R = Math.min(h * .3, w * .14);
    const right = x + w, midY = y + h * .5;
    const homeX = Math.min(right + R * 3.2, W - R * 1.4), contactX = right + R * 1.02;
    if (t0 === null) t0 = t;
    const tt = t - t0, P = 8, cyc = Math.floor(tt / P), k = (tt % P) / P;
    const back = v => { const c = 1.7; return 1 + (c + 1) * Math.pow(v - 1, 3) + c * Math.pow(v - 1, 2); };
    let cx = homeX, r = R;
    if (k < .12) r = R * back(k / .12);                                              // forms, with a little wobble
    else if (k < .36) r = R;                                                          // rests
    else if (k < .62) cx = homeX + (contactX - homeX) * Math.pow((k - .36) / .26, 3); // drawn to the name, faster and faster
    else if (k < .665) { cx = contactX; r = R * (1 - (k - .62) / .045); }             // pops on contact
    else r = 0;                                                                       // gone until it reforms
    const cy = midY + Math.sin(tt * .9) * h * .05;
    const cr = lensCanvas.getBoundingClientRect(), kx = lensCanvas.width / cr.width, ky = lensCanvas.height / cr.height;
    home = { left: cr.left + (homeX - R) / kx, top: cr.bottom - (cy + R) / ky, width: 2 * R / kx, height: 2 * R / ky };
    if (k >= .62 && popped !== cyc && !reduce) { popped = cyc; water2.burst(cr.left + (contactX - R) / kx, cr.bottom - cy / ky); }
    const a = -tt * 1.2, r1 = r * .45;
    return [[cx, cy, Math.max(r, .001)], [cx + Math.cos(a) * r * 1.05 + r * .35, cy + Math.sin(a) * r * .7, Math.max(r1, .001)]];
  },
});
addEventListener('resize', () => measureName());
const fishApi = school(schoolCanvas, { reduce, centerEl: { getBoundingClientRect: () => home || nameEl.getBoundingClientRect() }, avoidEl: document.querySelector('.hero-copy'), onFound: celebrate });
const diveLens = lens(document.getElementById('dive-lens'), {
  reduce,
  drops(W, H, t) {
    // low and to the right, below the three rules, so it never sits on the text
    const R = Math.min(W, H) * .13, cx = W * (.7 + .14 * Math.sin(t * .2)), cy = H * (.25 + .03 * Math.cos(t * .27));
    return [[cx, cy, R], [cx - R * 1.25 + Math.cos(t * .6) * R * .3, cy - R * .25 + Math.sin(t * .6) * R * .2, R * .55]];
  },
});
window.__site = { fish: fishApi };
const stack = [...document.querySelectorAll('.quests .quest')];
const marquee = document.querySelector('.marquee-track');

/* ---------- Scroll choreography ---------- */
const items = [...document.querySelectorAll('[data-m]')];
const heroText = document.querySelector('.hero-text');
const dive = document.querySelector('.dive');
const depthBar = document.querySelector('.depth-line i'), depthRead = document.querySelector('.depth-read');
let ticking = false;

function choreograph() {
  ticking = false;
  const vh = innerHeight;
  for (const el of items) {
    const r = el.getBoundingClientRect();
    const kind = el.dataset.m, delay = +(el.dataset.d || 0);
    if (kind === 'draw') { el.style.setProperty('--draw', reduce ? 1 : clamp((vh * .62 - r.top) / r.height).toFixed(4)); continue; }
    const raw = reduce ? 1 : clamp((vh - r.top) / (vh * .55) - delay), p = ease(raw);
    if (kind === 'rise') { el.style.opacity = p; el.style.transform = `translate3d(0, ${((1 - p) * 40).toFixed(1)}px, 0)`; }
    else if (kind === 'zoom') { el.style.opacity = p; el.style.transform = `scale(${(.94 + .06 * p).toFixed(4)})`; }
    else if (kind === 'slide') { el.style.opacity = p; el.style.transform = `translate3d(${((1 - p) * -36).toFixed(1)}px, 0, 0)`; }
    else if (kind === 'tilt') { el.style.opacity = clamp(p * 1.4); el.style.transform = `perspective(1400px) rotateX(${((1 - p) * 12).toFixed(2)}deg) translate3d(0, ${((1 - p) * 70).toFixed(1)}px, 0)`; }
    else if (kind === 'wipe') {
      el.style.clipPath = `inset(0 0 ${((1 - p) * 100).toFixed(2)}% 0 round 14px)`;
      const img = el.querySelector('img'); if (img) img.style.transform = `scale(${(1.06 - .06 * p).toFixed(4)})`;
    }
    else if (kind === 'words') {
      [...el.querySelectorAll('.w > span')].forEach((w, i) => {
        const q = ease(clamp(raw * 1.5 - i * .16));
        w.style.transform = `translate3d(0, ${((1 - q) * 105).toFixed(1)}%, 0) rotate(${((1 - q) * 5).toFixed(2)}deg)`;
      });
    }
  }
  if (!reduce) {
    // hero: the blob swells and turns as you leave, the name's letters drift apart, the text lifts away
    const e = clamp(scrollY / (vh * .95));
    heroLens && heroLens.setSpin(e * 2.2);
    nameLines.forEach((n, i) => { n.style.letterSpacing = (.02 + e * .22).toFixed(3) + 'em'; n.style.transform = `translate3d(${((i ? 1 : -1) * e * 6).toFixed(2)}vw, 0, 0)`; });
    lensCanvas.style.opacity = schoolCanvas.style.opacity = (1 - e * .9).toFixed(3);
    if (heroText) { heroText.style.transform = `translate3d(0, ${(-e * 60).toFixed(1)}px, 0)`; heroText.style.opacity = (1 - e * .9).toFixed(3); }
    // the giant line slides sideways with the scroll
    if (marquee) { const r = marquee.getBoundingClientRect(); marquee.style.transform = `translate3d(${(-(vh - r.top) * .55).toFixed(1)}px, 0, 0)`; }
    // project stack: each card shrinks and dims as the next one slides over it
    stack.forEach((card, i) => {
      const next = stack[i + 1];
      if (!next) { card.style.transform = ''; card.style.filter = ''; return; }
      const c = card.getBoundingClientRect(), nx = next.getBoundingClientRect();
      const k = clamp((c.bottom - nx.top) / c.height);
      card.style.transform = `scale(${(1 - k * .07).toFixed(4)})`; card.style.filter = `brightness(${(1 - k * .35).toFixed(3)})`;
    });
    // the dive blob turns and breathes as you pass through
    if (diveLens && dive) { const r = dive.getBoundingClientRect(); diveLens.setSpin((vh / 2 - (r.top + r.height / 2)) / vh * 2.2); }
  }
  // the water deepens while the dive band holds the middle of the screen
  if (dive) {
    const r = dive.getBoundingClientRect(), mid = vh / 2;
    sea.setDepth(Math.min(clamp((mid - r.top) / (vh * .4)), clamp((r.bottom - mid) / (vh * .4))));
  }
  const max = document.documentElement.scrollHeight - vh, pr = max > 0 ? clamp(scrollY / max) : 0;
  if (depthBar) { depthBar.style.height = (pr * 100) + '%'; depthRead.textContent = Math.round(pr * 120) + ' m'; }
}
const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(choreograph); } };
addEventListener('scroll', request, { passive: true }); addEventListener('resize', request); choreograph();

/* ---------- Count the proof number up once ---------- */
document.querySelectorAll('[data-count]').forEach(el => {
  const to = +el.dataset.count;
  if (reduce) { el.textContent = to; return; }
  const t0 = performance.now() + 400;
  const tick = t => { const k = ease(clamp((t - t0) / 1300)); el.textContent = Math.round(to * k); if (k < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});

/* ---------- The dive: slow silhouettes, a few small fish, bubbles ---------- */
const reef = document.getElementById('reef');
if (reef && dive) {
  const S = 4, rc = reef.getContext('2d');
  let W = 0, H = 0;
  const size = () => { W = Math.ceil(dive.clientWidth / S); H = Math.ceil(dive.clientHeight / S); reef.width = W; reef.height = H; rc.imageSmoothingEnabled = false; };
  size(); addEventListener('resize', size);
  const BIG = [
    '.......XXXXXX.........',
    '....XXXXXXXXXXXX....X.',
    '..XXXXXXXXXXXXXXXX.XX.',
    'XXXXXXXXXXXXXXXXXXXXX.',
    '..XXXXXXXXXXXXXXXX.XX.',
    '....XXXXXXXXXXXX....X.',
    '.......XXXXXX.........',
  ];
  const SMALL = ['.XXX.', 'XXXXX', '.XXX.'];
  const giants = [{ x: .1, y: .25, v: .05, c: 'rgba(105,217,245,.10)', s: 3 }, { x: .7, y: .62, v: -.035, c: 'rgba(231,176,222,.10)', s: 4 }, { x: .4, y: .85, v: .03, c: 'rgba(105,217,245,.07)', s: 2 }];
  const smalls = Array.from({ length: 7 }, (_, i) => ({ x: Math.random(), y: .15 + Math.random() * .75, v: (Math.random() < .5 ? -1 : 1) * (.05 + Math.random() * .06), c: i % 2 ? '#F08FA8' : '#FF8A5C', ph: Math.random() * 6 }));
  const bub = Array.from({ length: 26 }, () => ({ x: Math.random(), y: Math.random(), s: .06 + Math.random() * .12 }));
  const sprite = (map, x, y, s, flip, c) => { rc.fillStyle = c; const w = map[0].length; for (let r = 0; r < map.length; r++) for (let k = 0; k < w; k++) if (map[r][k] === 'X') rc.fillRect(Math.round(x + (flip ? w - 1 - k : k) * s), Math.round(y + r * s), s, s); };
  const draw = t => {
    rc.clearRect(0, 0, W, H);
    for (const f of smalls) { if (!reduce) { f.x += f.v / W; if (f.x > 1.05) f.x = -.05; if (f.x < -.05) f.x = 1.05; } sprite(SMALL, f.x * W, f.y * H + Math.sin(t / 800 + f.ph) * 1.5, 1, f.v < 0, f.c); }
    rc.fillStyle = 'rgba(221,247,255,.5)';
    for (const b of bub) { if (!reduce) b.y -= b.s / H; if (b.y < 0) { b.y = 1; b.x = Math.random(); } rc.fillRect(Math.round(b.x * W + Math.sin(t / 1100 + b.x * 30) * 1.5), Math.round(b.y * H), 1, 1); }
  };
  if (reduce) draw(0);
  else {
    let on = false;
    const run = t => { draw(t); if (on) requestAnimationFrame(run); };
    new IntersectionObserver(([e]) => { if (e.isIntersecting && !on) { on = true; requestAnimationFrame(run); } else if (!e.isIntersecting) on = false; }).observe(dive);
  }
}

/* ---------- Degree progress ---------- */
const xp = document.getElementById('xp-fill');
if (xp) {
  const pct = clamp((Date.now() - new Date(2023, 1, 1)) / (new Date(2027, 0, 31) - new Date(2023, 1, 1))) * 100;
  document.getElementById('xp-text').textContent = pct >= 100 ? 'Degree complete.' : `${Math.round(pct)}% of the way to graduation.`;
  new IntersectionObserver(([en], o) => { if (en.isIntersecting) { xp.style.width = pct + '%'; o.disconnect(); } }).observe(xp);
}

/* ---------- Glass catches the light under the cursor ---------- */
if (!coarse) document.querySelectorAll('.glass').forEach(el => {
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    el.style.setProperty('--shine', 1);
  });
  el.addEventListener('pointerleave', () => el.style.setProperty('--shine', 0));
});

/* ---------- Screenshot viewer ---------- */
const viewer = document.getElementById('viewer'), vimg = document.getElementById('viewer-img');
document.querySelectorAll('a.zoom').forEach(a => a.addEventListener('click', e => {
  if (!viewer.showModal) return;
  e.preventDefault(); vimg.src = a.href; vimg.alt = a.querySelector('img').alt; viewer.showModal();
}));
document.getElementById('viewer-close').addEventListener('click', () => viewer.close());
viewer.addEventListener('click', e => { if (e.target === viewer) viewer.close(); });

/* ---------- Phone menu ---------- */
const menu = document.getElementById('menu');
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { menu.open = false; }));
document.addEventListener('click', e => { if (!menu.contains(e.target)) menu.open = false; });
