/* eslint-disable react/no-unknown-property */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';

// Define the four colors matching our design system
const DESIGN_COLORS = [
  '#ff2a85', // Vibrant Pink/Magenta
  '#00ffaa', // Bright Cyan/Green
  '#8052ff', // Deep Violet
  '#ffb829', // Orange/Yellow
];

const AntigravityInner = ({
  count = 280,
  magnetRadius = 8, // Decreased to pull in fewer particles and decrease density around cursor
  ringRadius = 5,
  waveSpeed = 0.4,
  waveAmplitude = 1.2,
  particleSize = 1.8,
  lerpSpeed = 0.05,
  autoAnimate = false, // Keep it false to only deflect from active mouse position (as requested)
  particleVariance = 0.8,
  rotationSpeed = 0.05,
  depthFactor = 1,
  pulseSpeed = 3,
  fieldStrength = 10
}) => {
  // References to the core and glow instanced meshes
  const meshRef = useRef(null);
  const glowMeshRef = useRef(null);

  const { viewport } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const lastMousePos = useRef({ x: 0, y: 0 });
  const lastMouseMoveTime = useRef(0);
  const virtualMouse = useRef({ x: 0, y: 0 });

  // Custom refs to track mouse position globally on window (since canvas has pointer-events: none)
  const ndcMouse = useRef({ x: 0, y: 0 });
  const mouseActiveRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Map mouse pixels to normalized device coordinates [-1, 1] matching state.pointer
      ndcMouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      ndcMouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;

      lastMouseMoveTime.current = Date.now();
      mouseActiveRef.current = true;
    };

    const handleMouseLeave = () => {
      mouseActiveRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Map DESIGN_COLORS to THREE.Color objects for instancedMesh coloring
  const THREE_COLORS = useMemo(() => DESIGN_COLORS.map(c => new THREE.Color(c)), []);

  const particles = useMemo(() => {
    const temp = [];
    const width = viewport.width || 100;
    const height = viewport.height || 100;

    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const factor = 20 + Math.random() * 100;

      // Keep slow falling speed/drift
      const speed = 0.01 + Math.random() / 200;
      const xFactor = -50 + Math.random() * 100;
      const yFactor = -50 + Math.random() * 100;
      const zFactor = -50 + Math.random() * 100;

      const x = (Math.random() - 0.5) * width;
      const y = (Math.random() - 0.5) * height;
      const z = (Math.random() - 0.5) * 20;

      const randomRadiusOffset = (Math.random() - 0.5) * 2;

      // Assign a random color index from our design system colors
      const colorIndex = Math.floor(Math.random() * THREE_COLORS.length);

      // Store initial independent rotation angles and rotation speeds (our custom particle's independent animation)
      const rx = Math.random() * Math.PI * 2;
      const ry = Math.random() * Math.PI * 2;
      const rz = Math.random() * Math.PI * 2;
      const rotationSpeedX = (Math.random() - 0.5) * 0.015;
      const rotationSpeedY = (Math.random() - 0.5) * 0.015;
      const rotationSpeedZ = (Math.random() - 0.5) * 0.015;

      temp.push({
        t,
        factor,
        speed,
        xFactor,
        yFactor,
        zFactor,
        mx: x,
        my: y,
        mz: z,
        cx: x,
        cy: y,
        cz: z,
        vx: 0,
        vy: 0,
        vz: 0,
        randomRadiusOffset,
        colorIndex,

        // Custom animation parameters for 3D wireframe triangle (tetrahedron) spinning
        rx,
        ry,
        rz,
        rotationSpeedX,
        rotationSpeedY,
        rotationSpeedZ
      });
    }
    return temp;
  }, [count, viewport.width, viewport.height, THREE_COLORS]);

  // Set instance colors for both core and glow meshes on mount or update
  useEffect(() => {
    const mesh = meshRef.current;
    const glowMesh = glowMeshRef.current;
    if (!mesh || !glowMesh) return;

    for (let i = 0; i < count; i++) {
      const color = THREE_COLORS[particles[i].colorIndex];
      mesh.setColorAt(i, color);
      glowMesh.setColorAt(i, color);
    }

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (glowMesh.instanceColor) glowMesh.instanceColor.needsUpdate = true;
  }, [count, particles, THREE_COLORS]);

  useFrame(state => {
    const mesh = meshRef.current;
    const glowMesh = glowMeshRef.current;
    if (!mesh || !glowMesh) return;

    const { viewport: v } = state;

    // Use our custom window-tracked mouse coordinates
    const mx = ndcMouse.current.x;
    const my = ndcMouse.current.y;

    const mouseDist = Math.sqrt(Math.pow(mx - lastMousePos.current.x, 2) + Math.pow(my - lastMousePos.current.y, 2));

    // Verify if the mouse is actively moving to deflect from the cursor
    if (mouseDist > 0.001) {
      lastMousePos.current = { x: mx, y: my };
    }

    const mouseActive = mouseActiveRef.current && (Date.now() - lastMouseMoveTime.current < 4000);

    let destX = (mx * v.width) / 2;
    let destY = (my * v.height) / 2;

    if (autoAnimate && !mouseActive) {
      const time = state.clock.getElapsedTime();
      destX = Math.sin(time * 0.5) * (v.width / 4);
      destY = Math.cos(time * 0.5 * 2) * (v.height / 4);
    }

    const smoothFactor = 0.05;
    virtualMouse.current.x += (destX - virtualMouse.current.x) * smoothFactor;
    virtualMouse.current.y += (destY - virtualMouse.current.y) * smoothFactor;

    const targetX = virtualMouse.current.x;
    const targetY = virtualMouse.current.y;

    const globalRotation = state.clock.getElapsedTime() * rotationSpeed;

    particles.forEach((particle, i) => {
      let { t, speed, mx, my, mz, cz, randomRadiusOffset } = particle;

      t = particle.t += speed / 2;

      // Update independent internal rotation of the particle (independent animation)
      particle.rx += particle.rotationSpeedX;
      particle.ry += particle.rotationSpeedY;
      particle.rz += particle.rotationSpeedZ;

      const projectionFactor = 1 - cz / 50;
      const projectedTargetX = targetX * projectionFactor;
      const projectedTargetY = targetY * projectionFactor;

      const dx = mx - projectedTargetX;
      const dy = my - projectedTargetY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let targetPos = { x: mx, y: my, z: mz * depthFactor };
      let scaleFactor = 0.9; // Large base scale factor for floating triangles (not attracting)

      // Deflect only when cursor is active (or if autoAnimate is true)
      if (dist < magnetRadius && (mouseActive || autoAnimate)) {
        const angle = Math.atan2(dy, dx) + globalRotation;

        const wave = Math.sin(t * waveSpeed + angle) * (0.5 * waveAmplitude);
        // Spreads out attracted particles more around the ring to decrease density
        const deviation = randomRadiusOffset * (11 / (fieldStrength + 0.1));

        const currentRingRadius = ringRadius + wave + deviation;

        targetPos.x = projectedTargetX + currentRingRadius * Math.cos(angle);
        targetPos.y = projectedTargetY + currentRingRadius * Math.sin(angle);
        targetPos.z = mz * depthFactor + Math.sin(t) * (1 * waveAmplitude * depthFactor);

        // Dynamically scale/pulse particles inside the attraction field
        const currentDistToMouse = Math.sqrt(
          Math.pow(particle.cx - projectedTargetX, 2) + Math.pow(particle.cy - projectedTargetY, 2)
        );
        const distFromRing = Math.abs(currentDistToMouse - ringRadius);
        scaleFactor = 1 - distFromRing / 10;
        scaleFactor = Math.max(0.2, Math.min(1.0, scaleFactor));
      }

      particle.cx += (targetPos.x - particle.cx) * lerpSpeed;
      particle.cy += (targetPos.y - particle.cy) * lerpSpeed;
      particle.cz += (targetPos.z - particle.cz) * lerpSpeed;

      // Set position of the dummy object for instanced placement
      dummy.position.set(particle.cx, particle.cy, particle.cz);

      // Orientation control: look at the cursor when attracted, rotate independently when drifting
      if (dist < magnetRadius && (mouseActive || autoAnimate)) {
        dummy.lookAt(projectedTargetX, projectedTargetY, particle.cz);
        dummy.rotateX(Math.PI / 2);
      } else {
        // Set independent internal 3D rotation
        dummy.rotation.set(particle.rx, particle.ry, particle.rz);
      }

      const finalScale = scaleFactor * (0.8 + Math.sin(t * pulseSpeed) * 0.2 * particleVariance) * particleSize;

      // Update core mesh matrix
      dummy.scale.set(finalScale, finalScale, finalScale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Update glow mesh matrix (slightly larger scale for outlines)
      const glowScale = finalScale * 1.12;
      dummy.scale.set(glowScale, glowScale, glowScale);
      dummy.updateMatrix();
      glowMesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    glowMesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* Glow Pass (Thicker lines, low opacity) */}
      <instancedMesh ref={glowMeshRef} args={[null, null, count]}>
        <tetrahedronGeometry args={[0.3]} />
        <meshBasicMaterial wireframe={true} transparent={true} opacity={0.2} depthWrite={false} />
      </instancedMesh>

      {/* Core Pass (Solid bright lines) */}
      <instancedMesh ref={meshRef} args={[null, null, count]}>
        <tetrahedronGeometry args={[0.3]} />
        <meshBasicMaterial wireframe={true} transparent={true} opacity={0.65} />
      </instancedMesh>
    </group>
  );
};

const Antigravity = props => {
  return (
    <div className="particle-canvas-wrapper" style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
      <Canvas camera={{ position: [0, 0, 50], fov: 35 }} style={{ pointerEvents: 'none' }}>
        <AntigravityInner {...props} />
      </Canvas>
    </div>
  );
};

export default Antigravity;
