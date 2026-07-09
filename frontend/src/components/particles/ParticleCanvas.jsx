import { useEffect, useRef, useCallback } from 'react';

const TRIANGLE_COLORS = [
  '#ff2a85', // Vibrant Pink/Magenta
  '#00ffaa', // Bright Cyan/Green
  '#8052ff', // Deep Violet
  '#ffb829', // Orange/Yellow
];

const LOCAL_VERTICES = [
  { x: 0, y: -1, z: 0 },
  { x: 0.94, y: 0.5, z: -0.33 },
  { x: -0.94, y: 0.5, z: -0.33 },
  { x: 0, y: 0, z: 1 }
];

const EDGES = [
  [0, 1], [1, 2], [2, 0], // Base triangles
  [0, 3], [1, 3], [2, 3]  // Edges to apex
];

function rotate3D(vertex, rx, ry, rz) {
  let { x, y, z } = vertex;
  
  // Rotate around X
  let cosX = Math.cos(rx), sinX = Math.sin(rx);
  let y1 = y * cosX - z * sinX;
  let z1 = y * sinX + z * cosX;
  
  // Rotate around Y
  let cosY = Math.cos(ry), sinY = Math.sin(ry);
  let x2 = x * cosY + z1 * sinY;
  let z2 = -x * sinY + z1 * cosY;
  
  // Rotate around Z
  let cosZ = Math.cos(rz), sinZ = Math.sin(rz);
  let x3 = x2 * cosZ - y1 * sinZ;
  let y3 = x2 * sinZ + y1 * cosZ;
  
  return { x: x3, y: y3, z: z2 };
}

class Particle {
  constructor(canvasW, canvasH) {
    this.reset(canvasW, canvasH, true);
  }

  reset(canvasW, canvasH, initial = false) {
    this.mx = Math.random() * canvasW;
    this.my = initial ? Math.random() * canvasH : -50;
    this.mz = Math.random() * 200; // Depth
    
    this.cx = this.mx;
    this.cy = this.my;
    this.cz = this.mz;
    
    // Size variation to give strong perspective (e.g. size 8 to 28)
    this.size = 8 + Math.random() * 20; 
    this.currentSize = this.size;
    this.color = TRIANGLE_COLORS[Math.floor(Math.random() * TRIANGLE_COLORS.length)];
    this.opacity = 0.2 + Math.random() * 0.6;
    
    // Rotation angles
    this.rx = Math.random() * Math.PI * 2;
    this.ry = Math.random() * Math.PI * 2;
    this.rz = Math.random() * Math.PI * 2;
    
    // Rotation speeds
    this.rotationSpeedX = (Math.random() - 0.5) * 0.015;
    this.rotationSpeedY = (Math.random() - 0.5) * 0.015;
    this.rotationSpeedZ = (Math.random() - 0.5) * 0.015;
    
    // Base velocities
    this.vx = (Math.random() - 0.5) * 0.2;
    this.vy = 0.05 + Math.random() * 0.2; // Drift downwards slowly (slower speed)
    this.vz = (Math.random() - 0.5) * 0.05;
    
    // Constant drift values
    this.driftX = this.vx;
    this.driftY = this.vy;
    this.driftZ = this.vz;

    this.t = Math.random() * 100;
    this.speed = 0.05 + Math.random() * 0.1;
    this.randomRadiusOffset = (Math.random() - 0.5) * 2;
  }

  update(canvasW, canvasH, mouseX, mouseY) {
    let targetXPos = this.mx;
    let targetYPos = this.my;
    let targetZPos = this.mz;
    this.currentSize = this.size;

    if (mouseX !== null && mouseY !== null) {
      // Antigravity calculations
      const projectionFactor = 1 - this.cz / 300;
      const projectedTargetX = mouseX * projectionFactor;
      const projectedTargetY = mouseY * projectionFactor;

      const dx = this.mx - projectedTargetX;
      const dy = this.my - projectedTargetY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      const magnetRadius = 240;
      const ringRadius = 130;
      
      if (dist < magnetRadius) {
        // Form a ring around the cursor
        const angle = Math.atan2(dy, dx) + (this.t * 0.02);
        const wave = Math.sin(this.t * 0.25 + angle * 2) * 15; // ripples
        const deviation = this.randomRadiusOffset * 15;
        const currentRingRadius = ringRadius + wave + deviation;
        
        targetXPos = projectedTargetX + currentRingRadius * Math.cos(angle);
        targetYPos = projectedTargetY + currentRingRadius * Math.sin(angle);
        // depth-based wave factor
        targetZPos = this.mz + Math.sin(this.t * 0.2) * 20;
        
        // Scale dynamic sizing based on distance to the ring
        const currentDistToMouse = Math.sqrt(Math.pow(this.cx - projectedTargetX, 2) + Math.pow(this.cy - projectedTargetY, 2));
        const distFromRing = Math.abs(currentDistToMouse - ringRadius);
        let scaleFactor = 1 - distFromRing / 60;
        scaleFactor = Math.max(0.2, Math.min(1.0, scaleFactor));
        this.currentSize = this.size * scaleFactor;
      }
    }
    
    // Add phase speed
    this.t += this.speed;

    // Add normal drift to base coordinates
    this.mx += this.vx;
    this.my += this.vy;
    this.mz += this.vz;
    
    // Damping/friction for velocity
    this.vx = this.vx * 0.95 + this.driftX * 0.05;
    this.vy = this.vy * 0.95 + this.driftY * 0.05;
    this.vz = this.vz * 0.95 + this.driftZ * 0.05;
    
    // Rotations
    this.rx += this.rotationSpeedX;
    this.ry += this.rotationSpeedY;
    this.rz += this.rotationSpeedZ;
    
    // Lerp current positions to target
    const lerpSpeed = 0.04;
    this.cx += (targetXPos - this.cx) * lerpSpeed;
    this.cy += (targetYPos - this.cy) * lerpSpeed;
    this.cz += (targetZPos - this.cz) * lerpSpeed;

    // Wrap around drift coordinates
    if (this.mx < -100) {
      this.mx = canvasW + 100;
      this.cx = this.mx;
    }
    if (this.mx > canvasW + 100) {
      this.mx = -100;
      this.cx = this.mx;
    }
    if (this.my > canvasH + 100) {
      this.my = -100;
      this.mx = Math.random() * canvasW;
      this.cx = this.mx;
      this.cy = this.my;
    }
    if (this.mz < 0) this.mz = 200;
    if (this.mz > 200) this.mz = 0;
  }

  draw(ctx) {
    const focalLength = 200;
    const scale = focalLength / (focalLength + this.cz);
    
    // Project vertices
    const rotated = LOCAL_VERTICES.map(v => {
      const localSize = this.currentSize;
      const rv = rotate3D({ x: v.x * localSize, y: v.y * localSize, z: v.z * localSize }, this.rx, this.ry, this.rz);
      const sx = this.cx + rv.x * scale;
      const sy = this.cy + rv.y * scale;
      return { x: sx, y: sy };
    });
    
    ctx.save();
    
    // Glow pass (thick, highly transparent stroke)
    ctx.beginPath();
    EDGES.forEach(([i, j]) => {
      ctx.moveTo(rotated[i].x, rotated[i].y);
      ctx.lineTo(rotated[j].x, rotated[j].y);
    });
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3.5 * scale;
    ctx.globalAlpha = this.opacity * 0.2;
    ctx.stroke();
    
    // Core pass (thin, bright stroke)
    ctx.beginPath();
    EDGES.forEach(([i, j]) => {
      ctx.moveTo(rotated[i].x, rotated[i].y);
      ctx.lineTo(rotated[j].x, rotated[j].y);
    });
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.0 * scale;
    ctx.globalAlpha = this.opacity;
    ctx.stroke();
    
    ctx.restore();
  }
}

export default function ParticleCanvas({
  particleCount = 280,
  className = '',
  style = {},
  connectionDistance = 80,
  showConnections = false,
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
