// Imperative confetti burst — call burstConfetti(x, y, color) from anywhere.
// Spawns N particles with physics that fade out.

const PARTICLE_COUNT = 60;

export function burstConfetti(x, y, color = '#00d4ff') {
  const container = document.createElement('div');
  container.style.cssText = `position:fixed;left:0;top:0;pointer-events:none;z-index:99999;`;
  document.body.appendChild(container);

  const particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = document.createElement('div');
    const size = 4 + Math.random() * 6;
    const angle = Math.random() * Math.PI * 2;
    const speed = 200 + Math.random() * 600;
    const c = Math.random() < 0.6 ? color : (Math.random() < 0.5 ? '#00d4ff' : '#ff2eaa');
    p.style.cssText = `
      position:fixed; left:${x}px; top:${y}px;
      width:${size}px; height:${size}px;
      background:${c}; box-shadow:0 0 8px ${c};
      transform:translate(-50%,-50%) rotate(${Math.random()*360}deg);
      transition:none;
      ${Math.random() < 0.5 ? 'border-radius:50%;' : ''}
    `;
    container.appendChild(p);
    particles.push({
      el: p,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 200, // slight upward bias
      x, y,
      rot: Math.random() * 360,
      vrot: (Math.random() - 0.5) * 720,
      life: 0,
    });
  }

  const t0 = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - t0) / 1000);
    let alive = false;
    particles.forEach((p) => {
      p.life = (now - t0) / 1000;
      if (p.life > 1.6) { p.el.style.display = 'none'; return; }
      alive = true;
      p.vy += 1400 * 0.016; // gravity
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.rot += p.vrot * 0.016;
      const opacity = Math.max(0, 1 - p.life / 1.6);
      p.el.style.left = p.x + 'px';
      p.el.style.top  = p.y + 'px';
      p.el.style.opacity = opacity;
      p.el.style.transform = `translate(-50%,-50%) rotate(${p.rot}deg)`;
    });
    if (alive) requestAnimationFrame(frame);
    else container.remove();
  }
  requestAnimationFrame(frame);
}
