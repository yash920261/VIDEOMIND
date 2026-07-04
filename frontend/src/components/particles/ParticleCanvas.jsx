import { useEffect, useRef, useCallback } from 'react';

const COLORS = {
  plum: '#8052ff',
  amber: '#ffb829',
  lichen: '#15846e',
  bone: '#ffffff',
  plumDim: 'rgba(128, 82, 255, 0.4)',
  amberDim: 'rgba(255, 184, 41, 0.3)',
  lichenDim: 'rgba(21, 132, 110, 0.3)',
  boneDim: 'rgba(255, 255, 255, 0.15)',
};

const PALETTE = [
  COLORS.plum, COLORS.plum, COLORS.plum,
  COLORS.amber, COLORS.amber,
  COLORS.lichen,
  COLORS.bone, COLORS.bone,
  COLORS.plumDim, COLORS.amberDim, COLORS.lichenDim, COLORS.boneDim,
];

const SHAPES = ['triangle', 'circle', 'diamond', 'triangle', 'triangle'];

function drawTriangle(ctx, x, y, size, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.866, size * 0.5);
  ctx.lineTo(-size * 0.866, size * 0.5);
  ctx.closePath();
  ctx.restore();
}

function drawDiamond(ctx, x, y, size, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.7, 0);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * 0.7, 0);
  ctx.closePath();
  ctx.restore();
}

function drawShape(ctx, shape, x, y, size, rotation, color, opacity, filled) {
  ctx.globalAlpha = opacity;
  if (filled) {
    ctx.fillStyle = color;
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
  }

  switch (shape) {
    case 'triangle':
      drawTriangle(ctx, x, y, size, rotation);
      filled ? ctx.fill() : ctx.stroke();
      break;
    case 'diamond':
      drawDiamond(ctx, x, y, size, rotation);
      filled ? ctx.fill() : ctx.stroke();
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
      filled ? ctx.fill() : ctx.stroke();
      break;
    default:
      break;
  }
  ctx.globalAlpha = 1;
}

class Particle {
  constructor(canvasW, canvasH) {
    this.reset(canvasW, canvasH, true);
  }

  reset(canvasW, canvasH, initial = false) {
    this.x = Math.random() * canvasW;
    this.y = initial ? Math.random() * canvasH : -20;
    this.size = 2 + Math.random() * 5;
    this.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    this.shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    this.opacity = 0.1 + Math.random() * 0.7;
    this.baseOpacity = this.opacity;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.015;
    this.vx = (Math.random() - 0.5) * 0.25;
    this.vy = (Math.random() - 0.5) * 0.12;
    this.filled = Math.random() > 0.4;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.004 + Math.random() * 0.012;
  }

  update(canvasW, canvasH, mouseX, mouseY) {
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;
    this.pulsePhase += this.pulseSpeed;
    this.opacity = this.baseOpacity * (0.6 + 0.4 * Math.sin(this.pulsePhase));

    // Smooth mouse interaction
    if (mouseX !== null && mouseY !== null) {
      const dx = this.x - mouseX;
      const dy = this.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const interactionRadius = 120;

      if (dist < interactionRadius) {
        const force = (1 - dist / interactionRadius) * 0.4;
        this.x += dx * force * 0.015;
        this.y += dy * force * 0.015;
        this.opacity = Math.min(1, this.baseOpacity + force * 0.4);
      }
    }

    // Wrap around
    if (this.x < -20) this.x = canvasW + 20;
    if (this.x > canvasW + 20) this.x = -20;
    if (this.y < -20) this.y = canvasH + 20;
    if (this.y > canvasH + 20) this.y = -20;
  }

  draw(ctx) {
    drawShape(ctx, this.shape, this.x, this.y, this.size, this.rotation, this.color, this.opacity, this.filled);
  }
}

export default function ParticleCanvas({
  particleCount = 800,
  className = '',
  style = {},
  connectionDistance = 100,
  showConnections = true,
}) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: null, y: null });
  const rafRef = useRef(null);

  const initParticles = useCallback((w, h) => {
    particlesRef.current = [];
    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push(new Particle(w, h));
    }
  }, [particleCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let w, h;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (particlesRef.current.length === 0) {
        initParticles(w, h);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    // Mouse tracking
    const handleMouseMove = (e) => {
      const rect = canvas.parentElement.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = null;
      mouseRef.current.y = null;
    };

    // Listen on parent for proper coordinate calculation
    const parent = canvas.parentElement;
    parent.addEventListener('mousemove', handleMouseMove);
    parent.addEventListener('mouseleave', handleMouseLeave);

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, w, h);

      const particles = particlesRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Update and draw particles
      if (!prefersReducedMotion) {
        for (let i = 0; i < particles.length; i++) {
          particles[i].update(w, h, mx, my);
        }
      }

      for (let i = 0; i < particles.length; i++) {
        particles[i].draw(ctx);
      }

      // Draw connections
      if (showConnections) {
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < connectionDistance) {
              const alpha = (1 - dist / connectionDistance) * 0.08;
              ctx.strokeStyle = `rgba(128, 82, 255, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      parent.removeEventListener('mousemove', handleMouseMove);
      parent.removeEventListener('mouseleave', handleMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [initParticles, connectionDistance, showConnections]);

  return (
    <div className={`particle-canvas-wrapper ${className}`} style={style}>
      <canvas ref={canvasRef} />
    </div>
  );
}
