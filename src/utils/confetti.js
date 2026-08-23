// Lightweight celebratory canvas confetti generator (Zero-dependency)
export function fireConfetti({
  particleCount = 60,
  spread = 70,
  origin = { x: 0.5, y: 0.6 },
  colors = ['#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#eab308'],
  duration = 2500
} = {}) {
  if (typeof window === 'undefined' || !document.body) return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth * window.devicePixelRatio);
  let height = (canvas.height = window.innerHeight * window.devicePixelRatio);
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const particles = [];
  const startX = origin.x * window.innerWidth;
  const startY = origin.y * window.innerHeight;

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI / 180) * (270 + (Math.random() - 0.5) * spread);
    const speed = 7 + Math.random() * 8;
    particles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed * (0.8 + Math.random() * 0.4),
      vy: Math.sin(angle) * speed * (0.8 + Math.random() * 0.4),
      size: 5 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      shape: Math.random() > 0.4 ? 'rect' : 'circle',
      opacity: 1,
      gravity: 0.28,
      drag: 0.96
    });
  }

  let animationFrame;
  const startTime = Date.now();

  function render() {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / duration;

    if (progress >= 1) {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      return;
    }

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (let p of particles) {
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.opacity = Math.max(0, 1 - Math.pow(progress, 1.5));

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    animationFrame = requestAnimationFrame(render);
  }

  animationFrame = requestAnimationFrame(render);

  return () => {
    cancelAnimationFrame(animationFrame);
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  };
}
