// Life in the water, page-wide: drifting specks, pixel bubbles rising, twinkling sparkles,
// a current that follows your scroll, and a burst of bubbles wherever you click the water.
export function sea(canvas, { reduce }) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  const size = () => { W = canvas.width = innerWidth; H = canvas.height = innerHeight; ctx.imageSmoothingEnabled = false; };
  size(); addEventListener('resize', size);
  const rand = (a, b) => a + Math.random() * (b - a);
  const many = innerWidth < 820 ? .5 : 1;
  const specks = Array.from({ length: Math.round(70 * many) }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(.6, 1.8), s: rand(.05, .25), ph: rand(0, 6), a: rand(.15, .45) }));
  const bubbles = Array.from({ length: Math.round(24 * many) }, () => newBubble(true));
  const sparkles = Array.from({ length: Math.round(12 * many) }, () => ({ x: rand(0, W), y: rand(0, H), ph: rand(0, 6), c: ['#F08FA8', '#8FD9CF', '#D4FF24', '#E7B0DE'][Math.floor(rand(0, 4))] }));
  const bursts = [];
  function newBubble(anywhere) { return { x: rand(0, W), y: anywhere ? rand(0, H) : H + rand(10, 80), r: Math.round(rand(2, 6)), s: rand(.25, .7), ph: rand(0, 6) }; }

  let current = 0, lastY = scrollY;
  addEventListener('scroll', () => { current += (scrollY - lastY) * .05; lastY = scrollY; }, { passive: true });

  // a pixel ring bubble with a highlight
  function bubble(x, y, r, a) {
    ctx.globalAlpha = a;
    ctx.fillStyle = '#DDF7FF';
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
      const d = Math.hypot(i, j);
      if (d > r - .9 && d <= r + .1) ctx.fillRect(Math.round(x + i * 2), Math.round(y + j * 2), 2, 2);
    }
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(Math.round(x - r + 1) + 2, Math.round(y - r * 2 + 4), 2, 2);
  }
  // a four-point pixel sparkle
  function sparkle(x, y, s, c, a) {
    ctx.globalAlpha = a; ctx.fillStyle = c;
    ctx.fillRect(x - s, y, s * 2 + 1, 1); ctx.fillRect(x, y - s, 1, s * 2 + 1);
    if (s > 2) { ctx.fillRect(x - 1, y - 1, 3, 3); }
  }

  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    current *= .92;
    for (const p of specks) {
      if (!reduce) { p.y -= p.s * .3 + current * .5; p.x += Math.sin(t / 3000 + p.ph) * .08; }
      if (p.y < -5) p.y = H + 5; if (p.y > H + 5) p.y = -5;
      ctx.globalAlpha = p.a; ctx.fillStyle = '#CFEFF0';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    }
    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      if (!reduce) { b.y -= b.s + Math.max(0, current) * .4; b.ph += .02; }
      if (b.y < -20) bubbles[i] = newBubble(false);
      bubble(b.x + Math.sin(b.ph) * 4, b.y, b.r, .45);
    }
    for (const s of sparkles) {
      const tw = Math.max(0, Math.sin(t / 900 + s.ph));
      if (tw > .05) sparkle(Math.round(s.x), Math.round(s.y), Math.round(1 + tw * 3), s.c, tw * .9);
      if (tw < .02 && Math.random() < .02) { s.x = rand(0, W); s.y = rand(0, H); }
    }
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i]; b.life--;
      if (b.life <= 0) { bursts.splice(i, 1); continue; }
      b.x += b.vx; b.y += b.vy; b.vy -= .04; b.vx *= .97;
      if (b.kind === 'b') bubble(b.x, b.y, b.r, Math.min(1, b.life / 40));
      else sparkle(Math.round(b.x), Math.round(b.y), 3, b.c, Math.min(1, b.life / 30));
    }
    ctx.globalAlpha = 1;
    if (!reduce || bursts.length) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // click the water: a burst of bubbles and a pop of sparkles
  addEventListener('click', e => {
    if (e.target.closest('a, button, summary, input, .zoom, dialog')) return;
    for (let i = 0; i < 9; i++) bursts.push({ kind: 'b', x: e.clientX, y: e.clientY, vx: rand(-1.6, 1.6), vy: rand(-2.6, -.6), r: Math.round(rand(2, 5)), life: Math.round(rand(50, 90)) });
    for (let i = 0; i < 6; i++) bursts.push({ kind: 's', x: e.clientX, y: e.clientY, vx: rand(-2.4, 2.4), vy: rand(-2.4, 1), c: ['#F08FA8', '#8FD9CF', '#D4FF24', '#E7B0DE'][i % 4], life: Math.round(rand(30, 50)) });
    if (reduce) requestAnimationFrame(frame);
  });
  return {
    burst(x, y) {
      for (let i = 0; i < 18; i++) bursts.push({ kind: 'b', x: x + rand(-14, 14), y: y + rand(-50, 50), vx: rand(.4, 3.2), vy: rand(-2.6, .8), r: Math.round(rand(2, 6)), life: Math.round(rand(55, 100)) });
      for (let i = 0; i < 8; i++) bursts.push({ kind: 's', x, y: y + rand(-40, 40), vx: rand(.4, 2.8), vy: rand(-2, 1.2), c: ['#F08FA8', '#8FD9CF', '#D4FF24', '#E7B0DE'][i % 4], life: Math.round(rand(28, 46)) });
      if (reduce) requestAnimationFrame(frame);
    },
  };
}
