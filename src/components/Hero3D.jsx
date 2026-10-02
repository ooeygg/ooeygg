import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

/* Drifting ember particles — the "alive" layer */
function Embers({ count = 350 }) {
  const ref = useRef();
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 9;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
      speeds[i] = 0.15 + Math.random() * 0.7;
    }
    return { positions, speeds };
  }, [count]);

  useFrame((state, delta) => {
    const attr = ref.current.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      let y = attr.getY(i) + speeds[i] * delta;
      if (y > 4.5) y = -4.5;
      attr.setY(i, y);
    }
    attr.needsUpdate = true;
    ref.current.rotation.y = state.clock.elapsedTime * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#ee6e45"
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* Molten core — distorted icosahedron, slow tumble */
function Core() {
  const ref = useRef();
  useFrame((state) => {
    ref.current.rotation.y = state.clock.elapsedTime * 0.15;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.2;
  });
  return (
    <Float speed={2} rotationIntensity={0.4} floatIntensity={1.2}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[1.4, 64]} />
        <MeshDistortMaterial
          color="#e2552c"
          emissive="#e2552c"
          emissiveIntensity={0.35}
          roughness={0.25}
          metalness={0.6}
          distort={0.45}
          speed={2.2}
        />
      </mesh>
    </Float>
  );
}

/* Hero canvas — mount with client:visible so it only hydrates in view */
export default function Hero3D() {
  return (
    <div className="hero-3d" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 5], fov: 42 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#0a0908']} />
        <fog attach="fog" args={['#0a0908', 6, 12]} />
        <ambientLight intensity={0.4} />
        <pointLight position={[4, 3, 4]} intensity={30} color="#ee6e45" />
        <pointLight position={[-4, -2, 2]} intensity={10} color="#f4a07c" />
        <Embers />
        <Core />
        <EffectComposer>
          <Bloom intensity={0.9} luminanceThreshold={0.15} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette darkness={0.75} offset={0.25} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
