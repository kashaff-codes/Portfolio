// A small school of pixel fish that swims loosely around a point (the hero blob).
// They never follow the cursor; they only move aside if it comes very close. One fish is glitched.
const SPRITE = [
  '..KKKK...',
  '.KPPHPK..',
  'KPPPPWEK.',
  'PKPPPPPK.',
  'KPPBPPK..',
  '.KKKKK...',
];
const PAL = {
  rose: { K: '#400849', P: '#DA7B93', H: '#F6D3EC', W: '#FFFFFF', E: '#400849', B: '#F2A0BE' },
  cyan: { K: '#5A1E0A', P: '#FF8A5C', H: '#FFD2BE', W: '#FFFFFF', E: '#3A1408', B: '#F2A0BE' },
  orchid: { K: '#400849', P: '#E7B0DE', H: '#FBE9F7', W: '#FFFFFF', E: '#400849', B: '#DA7B93' },
};

export function school(canvas, { reduce, centerEl, avoidEl, onFound }) {
  const S = innerWidth < 820 ? 3 : 4;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  const size = () => {
    const r = canvas.getBoundingClientRect();
    W = Math.ceil(r.width / S); H = Math.ceil(r.height / S); canvas.width = W; canvas.height = H; ctx.imageSmoothingEnabled = false;
  };
  size(); addEventListener('resize', size);
  const rand = (a, b) => a + Math.random() * (b - a);
  const kinds = ['rose', 'cyan', 'orchid', 'rose', 'cyan', 'rose', 'orchid'];
  const fish = kinds.map((k, i) => ({ a: rand(0, 6.28), rr: rand(1.25, 1.6), sp: rand(.0016, .0026) * (i % 3 ? 1 : 1), dy: rand(-.25, .25), pal: PAL[k], ph: rand(0, 6), glitch: i === 3, x: 0, y: 0, ox: 0, oy: 0, flip: false }));
  let mouse = { x: -1e4, y: -1e4 };
  addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); mouse = { x: (e.clientX - r.left) / S, y: (e.clientY - r.top) / S }; }, { passive: true });

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    const cr = canvas.getBoundingClientRect(), br = centerEl.getBoundingClientRect();
    const cx = (br.left + br.width / 2 - cr.left) / S, cy = (br.top + br.height / 2 - cr.top) / S;
    const R = Math.min(br.width, br.height) / S * .5;
    const avoid = avoidEl && avoidEl.getBoundingClientRect();
    for (const f of fish) {
      if (!reduce) f.a += f.sp;
      // a loose orbit just outside the blob's edge, bobbing up and down
      let tx = cx + Math.cos(f.a) * R * f.rr, ty = cy + Math.sin(f.a) * R * f.rr * .62 + f.dy * R + Math.sin(t / 900 + f.ph) * 3;
      // step aside from the cursor only when it's right on top of the fish
      const dx = tx + f.ox - mouse.x, dy = ty + f.oy - mouse.y, d = Math.hypot(dx, dy);
      const push = d < 12 ? (12 - d) * 1.4 : 0;
      f.ox += ((d ? dx / d : 0) * push - f.ox) * .06; f.oy += ((d ? dy / d : 0) * push - f.oy) * .06;
      const nx = tx + f.ox, ny = ty + f.oy;
      f.flip = Math.sin(f.a) < 0 ? false : true; // moving left along the near side of the orbit
      if (Math.abs(nx - f.x) > .02) f.flip = nx < f.x;
      f.x = nx; f.y = ny;
      // fade out where the name and text sit, so fish never cross the words
      let alpha = 1;
      if (avoid) {
        const ax = (avoid.left - cr.left) / S, ay = (avoid.top - cr.top) / S, aw = avoid.width / S, ah = avoid.height / S;
        if (f.x > ax - 6 && f.x < ax + aw && f.y > ay - 4 && f.y < ay + ah) alpha = .0;
      }
      if (alpha <= 0) continue;
      const pal = f.glitch ? { ...f.pal, E: '#D4FF24', H: '#376E6F' } : f.pal;
      const slip = f.glitch && Math.sin(t / 120 + f.ph) > .9;
      const ox = Math.round(f.x - 4), oy = Math.round(f.y - 3), w = SPRITE[0].length;
      for (let r = 0; r < SPRITE.length; r++) for (let c = 0; c < w; c++) {
        const k = SPRITE[r][c]; if (k === '.') continue;
        ctx.fillStyle = pal[k];
        ctx.fillRect(ox + (f.flip ? w - 1 - c : c) + (slip && r === 2 ? 1 : 0), oy + r, 1, 1);
      }
      const tw = Math.floor(t / 170 + f.ph) % 2;          // tail flick
      ctx.fillStyle = pal.P; ctx.fillRect(f.flip ? ox + w : ox - 1, oy + 1 + tw, 1, 3);
    }
    if (!reduce) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  canvas.parentElement.addEventListener('click', e => {
    if (e.target.closest('a, button')) return;
    const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) / S, y = (e.clientY - r.top) / S;
    const g = fish.find(f => f.glitch);
    if (g && Math.abs(x - g.x) < 8 && Math.abs(y - g.y) < 6) { g.glitch = false; onFound && onFound(); }
  });
  return { fish, S };
}
