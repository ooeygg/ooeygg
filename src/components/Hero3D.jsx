import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { GlobalCanvas, useCanvasStore, useScrollbar } from '@14islands/r3f-scroll-rig';
import * as THREE from 'three';
import { sheet as sheetReady, rafDriver, coreProps, lenisReady, types } from '../film/project.js';

/* The scene is authored in "stage units": the camera sits 5 units back with a 42° fov,
   so the viewport is 3.84 units tall. r3f-scroll-rig's GlobalCanvas uses a pixel-space
   camera (so DOM-tracked meshes line up 1:1); the stage group scales units into it. */
const FOV = 42;
const CAMERA_Z = 5;
const VIEW_HEIGHT = 2 * CAMERA_Z * Math.tan(((FOV / 2) * Math.PI) / 180);

/* Subscribe to a Theatre object and keep its latest values in a ref for useFrame. */
function useTheatre(key, props) {
  const values = useRef(null);
  useEffect(() => {
    let off;
    sheetReady.then((sheet) => {
      const obj = sheet.object(key, props);
      values.current = obj.value;
      off = obj.onValuesChange((v) => (values.current = v), rafDriver);
    });
    return () => off?.();
  }, [key]);
  return values;
}

/* Feed the film's Lenis instance into scroll-rig's store, as its SmoothScrollbar would. */
function LenisBridge() {
  useEffect(() => {
    let off;
    lenisReady.then((lenis) => {
      const scroll = useCanvasStore.getState().scroll;
      const sync = ({ scroll: y, limit, velocity, direction, progress }) =>
        Object.assign(scroll, { y, x: 0, limit, velocity, direction, progress: progress || 0 });
      lenis.on('scroll', sync);
      useCanvasStore.setState({
        hasSmoothScrollbar: true,
        __lenis: lenis,
        scrollTo: (...args) => lenis.scrollTo(...args),
        onScroll: (cb) => {
          lenis.on('scroll', cb);
          lenis.emit();
          return () => lenis.off('scroll', cb);
        },
      });
      off = () => lenis.off('scroll', sync);
    });
    return () => off?.();
  }, []);
  return null;
}

/* Smoothed |scroll velocity|, 0 at rest — scrolling reads as thrust, not movement. */
function useThrust() {
  const { scroll } = useScrollbar();
  const thrust = useRef(0);
  useFrame((_, delta) => {
    const target = Math.min(Math.abs(scroll.velocity) / 40, 1);
    thrust.current = THREE.MathUtils.damp(thrust.current, target, 4, delta);
  });
  return thrust;
}

/* Drifting ember particles — the "alive" layer; they stream upward with scroll thrust */
function Embers({ count = 350, unit, thrust }) {
  const ref = useRef();
  const film = useTheatre('Stage / Embers', { opacity: types.number(0.85, { range: [0, 1] }) });
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
    const boost = 1 + thrust.current * 6;
    for (let i = 0; i < count; i++) {
      let y = attr.getY(i) + speeds[i] * delta * boost;
      if (y > 4.5) y = -4.5;
      attr.setY(i, y);
    }
    attr.needsUpdate = true;
    ref.current.rotation.y = state.clock.elapsedTime * 0.02;
    if (film.current) ref.current.material.opacity = film.current.opacity;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        // Point size is in world units; the stage group's scale doesn't apply to it.
        size={0.035 * unit}
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

/* Molten core — distorted icosahedron, slow tumble, choreographed by the film */
function Core({ thrust }) {
  const group = useRef();
  const mesh = useRef();
  const material = useRef();
  const film = useTheatre('Stage / Core', coreProps);
  const aspect = useThree((s) => s.size.width / s.size.height);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    mesh.current.rotation.y = t * 0.15;
    mesh.current.rotation.x = Math.sin(t * 0.2) * 0.2;
    material.current.distort = 0.45 + thrust.current * 0.2;
    const v = film.current;
    if (!v) return;
    // Moves are authored for landscape; portrait screens keep a smaller core in frame.
    const reach = Math.min(aspect / 1.6, 1);
    group.current.position.set(v.x * reach, v.y, 0);
    group.current.scale.setScalar(v.scale * (0.7 + 0.3 * reach));
    material.current.emissiveIntensity = v.glow;
  });

  return (
    <group ref={group}>
      <Float speed={2} rotationIntensity={0.4} floatIntensity={1.2}>
        <mesh ref={mesh}>
          <icosahedronGeometry args={[1.4, 64]} />
          <MeshDistortMaterial
            ref={material}
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
    </group>
  );
}

function Stage({ onReady }) {
  const stage = useRef();
  const bloom = useRef();
  const thrust = useThrust();
  const camera = useTheatre('Stage / Camera', { z: types.number(CAMERA_Z, { range: [1, 12] }) });
  const bloomFilm = useTheatre('Stage / Bloom', { intensity: types.number(0.9, { range: [0, 3] }) });
  const unit = useThree((s) => s.viewport.height) / VIEW_HEIGHT;
  const get = useThree((s) => s.get);

  useEffect(() => {
    // Compile shaders before the first frame (in parallel where the GPU supports it).
    const { gl, scene, camera: cam } = get();
    gl.compileAsync(scene, cam).catch(() => {}).finally(onReady);
  }, []);

  useFrame(() => {
    // Dolly by moving the stage toward the fixed scroll-rig camera.
    if (camera.current) stage.current.position.z = (CAMERA_Z - camera.current.z) * unit;
    if (bloomFilm.current && bloom.current) bloom.current.intensity = bloomFilm.current.intensity;
  });

  return (
    <>
      <color attach="background" args={['#0a0908']} />
      <fog attach="fog" args={['#0a0908', (CAMERA_Z + 1) * unit, (CAMERA_Z + 7) * unit]} />
      <group ref={stage}>
        <group scale={unit}>
          <ambientLight intensity={0.4} />
          {/* Physically-based falloff is 1/d², so scaling distances by `unit` needs unit² */}
          <pointLight position={[4, 3, 4]} intensity={30 * unit * unit} color="#ee6e45" />
          <pointLight position={[-4, -2, 2]} intensity={10 * unit * unit} color="#f4a07c" />
          <Embers unit={unit} thrust={thrust} />
          <Core thrust={thrust} />
        </group>
      </group>
      <EffectComposer>
        <Bloom ref={bloom} intensity={0.9} luminanceThreshold={0.15} luminanceSmoothing={0.2} mipmapBlur />
        <Vignette darkness={0.75} offset={0.25} />
      </EffectComposer>
    </>
  );
}

/* WebGL stage — hydrated by client:afterload (after first paint, GPU devices only);
   fades in over the CSS poster once shaders are compiled. Client-only render. */
export default function Hero3D() {
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className={ready ? 'hero-3d is-ready' : 'hero-3d'} aria-hidden="true">
      {mounted && (
        <GlobalCanvas
          style={{ position: 'absolute', inset: 0, height: '100%' }}
          camera={{ fov: FOV }}
          dpr={[1, 1.75]}
          frameloop={ready ? 'always' : 'never'}
          // EffectComposer renders the scene; scroll-rig's own global pass would double it.
          globalRender={false}
          // EffectComposer renders offscreen with its own multisampling.
          gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
        >
          <LenisBridge />
          <Stage onReady={() => setReady(true)} />
        </GlobalCanvas>
      )}
    </div>
  );
}
