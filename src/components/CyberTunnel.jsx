import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

/**
 * CyberTunnel — Full-screen Three.js / React-Three-Fiber background.
 *
 * Renders a continuous wireframe grid tunnel (rings + longitudinal lines)
 * rushing toward the camera, plus additive light streaks and a particle
 * field. A shared `warpRef` ({ active: boolean }) is read every frame so the
 * App can trigger a hyper-speed warp transition without causing React
 * re-renders.
 */

/* ------------------------------- Tunables -------------------------------- */
const RING_SEGMENTS = 64
const RING_COUNT = 30
const RING_SPACING = 4
const TUNNEL_LENGTH = RING_COUNT * RING_SPACING
const RING_RADIUS = 13
const CRUISE_SPEED = 9
const HYPER_SPEED = 180
const PARTICLE_COUNT = 700
const STREAK_COUNT = 60

const NEON_CYAN = new THREE.Color('#06b6d4')
const WARP_CYAN = new THREE.Color('#e0f7ff')

/* ------------------------------ Geometry --------------------------------- */
function buildGridGeometry() {
  const positions = []
  // Horizontal rings
  for (let r = 0; r < RING_COUNT; r++) {
    const z = -r * RING_SPACING
    for (let s = 0; s < RING_SEGMENTS; s++) {
      const a1 = (s / RING_SEGMENTS) * Math.PI * 2
      const a2 = ((s + 1) / RING_SEGMENTS) * Math.PI * 2
      positions.push(
        Math.cos(a1) * RING_RADIUS, Math.sin(a1) * RING_RADIUS, z,
        Math.cos(a2) * RING_RADIUS, Math.sin(a2) * RING_RADIUS, z,
      )
    }
  }
  // Longitudinal lines connecting rings
  for (let s = 0; s < RING_SEGMENTS; s++) {
    const a = (s / RING_SEGMENTS) * Math.PI * 2
    const x = Math.cos(a) * RING_RADIUS
    const y = Math.sin(a) * RING_RADIUS
    for (let r = 0; r < RING_COUNT - 1; r++) {
      positions.push(x, y, -r * RING_SPACING)
      positions.push(x, y, -(r + 1) * RING_SPACING)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  return geo
}

function buildParticleGeometry() {
  const arr = new Float32Array(PARTICLE_COUNT * 3)
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.random()) * 11
    arr[i * 3] = Math.cos(a) * r
    arr[i * 3 + 1] = Math.sin(a) * r * 0.65
    arr[i * 3 + 2] = -Math.random() * TUNNEL_LENGTH
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3))
  return geo
}

/* --------------------------- Grid Tunnel Layer --------------------------- */
function TunnelGrid({ warpRef }) {
  const geo = useMemo(buildGridGeometry, [])
  const materialRef = useRef()
  const speedRef = useRef(CRUISE_SPEED)
  const timeRef = useRef(0)

  // Store the original (unwrapped) vertex positions so we can re-pulse radii
  const base = useMemo(
    () => Float32Array.from(geo.attributes.position.array),
    [geo],
  )

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    timeRef.current += dt

    const target = warpRef.current.active ? HYPER_SPEED : CRUISE_SPEED
    speedRef.current = THREE.MathUtils.lerp(speedRef.current, target, 1 - Math.exp(-2.4 * dt))
    const dz = speedRef.current * dt

    const arr = geo.attributes.position.array
    const radiusPulse = 1 + 0.025 * Math.sin(timeRef.current * 1.4)

    for (let i = 0; i < arr.length; i += 3) {
      // Advance toward camera + wrap around for seamless looping
      let z = arr[i + 2] + dz
      if (z > 0.5) z -= TUNNEL_LENGTH
      arr[i + 2] = z

      // Per-ring breathing wave (phase derived from wrapped z)
      const phase = ((z % RING_SPACING) + RING_SPACING) % RING_SPACING
      const scale = radiusPulse + 0.018 * Math.sin(phase * Math.PI * 2)
      arr[i] = base[i] * scale
      arr[i + 1] = base[i + 1] * scale
    }
    geo.attributes.position.needsUpdate = true

    // Warp glow: brighten & shift line colour toward white
    const mat = materialRef.current
    if (mat) {
      const t = speedRef.current / HYPER_SPEED
      mat.opacity = THREE.MathUtils.lerp(0.4, 0.9, t)
      mat.color.lerpColors(NEON_CYAN, WARP_CYAN, t * 0.8)
    }
  })

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial ref={materialRef} color={NEON_CYAN} transparent opacity={0.4} />
    </lineSegments>
  )
}

/* --------------------------- Particle Field Layer ------------------------ */
function ParticleField({ warpRef }) {
  const geo = useMemo(buildParticleGeometry, [])
  const matRef = useRef()
  const speedRef = useRef(CRUISE_SPEED)

  // Per-particle random speed multiplier
  const mult = useMemo(() => {
    const m = new Float32Array(PARTICLE_COUNT)
    for (let i = 0; i < PARTICLE_COUNT; i++) m[i] = 0.6 + Math.random() * 1.4
    return m
  }, [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const target = warpRef.current.active ? HYPER_SPEED : CRUISE_SPEED
    speedRef.current = THREE.MathUtils.lerp(speedRef.current, target, 1 - Math.exp(-2.4 * dt))

    const arr = geo.attributes.position.array
    for (let i = 0; i < arr.length; i += 3) {
      let z = arr[i + 2] + speedRef.current * mult[i / 3] * dt
      if (z > 0.5) z -= TUNNEL_LENGTH
      arr[i + 2] = z
    }
    geo.attributes.position.needsUpdate = true

    if (matRef.current) {
      const t = speedRef.current / HYPER_SPEED
      matRef.current.opacity = THREE.MathUtils.lerp(0.75, 1, t)
      matRef.current.size = THREE.MathUtils.lerp(0.22, 0.5, t)
    }
  })

  return (
    <points geometry={geo}>
      <pointsMaterial
        ref={matRef}
        color="#3b82f6"
        size={0.22}
        transparent
        opacity={0.75}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

/* ------------------------------ Light Streaks ---------------------------- */
function LightStreaks({ warpRef }) {
  const meshes = useRef([])
  const matRef = useRef()
  const speedRef = useRef(CRUISE_SPEED)

  // Random static setup: position, length and per-streak speed
  const setup = useMemo(() => {
    const s = []
    for (let i = 0; i < STREAK_COUNT; i++) {
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * 9
      s.push({
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
        z: -Math.random() * TUNNEL_LENGTH,
        len: 3 + Math.random() * 5,
        speed: 2 + Math.random() * 3,
      })
    }
    return s
  }, [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const target = warpRef.current.active ? HYPER_SPEED : CRUISE_SPEED
    speedRef.current = THREE.MathUtils.lerp(speedRef.current, target, 1 - Math.exp(-2.4 * dt))

    meshes.current.forEach((mesh, i) => {
      if (!mesh) return
      const s = setup[i]
      let z = mesh.position.z + speedRef.current * s.speed * dt
      if (z > 1) z -= TUNNEL_LENGTH
      mesh.position.z = z
      // Streak brightens with warp
      mesh.scale.z = THREE.MathUtils.lerp(s.len, s.len * 3.2, speedRef.current / HYPER_SPEED)
    })

    if (matRef.current) {
      const t = speedRef.current / HYPER_SPEED
      matRef.current.opacity = THREE.MathUtils.lerp(0.7, 1, t)
    }
  })

  return (
    <group>
      {setup.map((s, i) => (
        <mesh
          key={i}
          ref={(el) => (meshes.current[i] = el)}
          position={[s.x, s.y, s.z]}
          scale={[1, 1, s.len]}
        >
          <cylinderGeometry args={[0.03, 0.03, 1, 6]} />
          <meshBasicMaterial
            ref={matRef}
            color="#71c5e8"
            transparent
            opacity={0.7}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------ Camera Rig ------------------------------- */
function CameraRig({ warpRef }) {
  const cameraRef = useRef()
  const speedRef = useRef(CRUISE_SPEED)

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const target = warpRef.current.active ? HYPER_SPEED : CRUISE_SPEED
    speedRef.current = THREE.MathUtils.lerp(speedRef.current, target, 1 - Math.exp(-2.4 * dt))

    const camera = cameraRef.current
    if (!camera) return
    const t = speedRef.current / HYPER_SPEED

    // FOV kick during warp for a "zoom through the tunnel" feel
    const fov = THREE.MathUtils.lerp(72, 92, t)
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
    // Subtle idle sway
    camera.position.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.4
    camera.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 0.22) * 0.3
    camera.lookAt(0, 0, -60)
  })

  return <perspectiveCamera ref={cameraRef} makeDefault position={[0, 0.5, 14]} fov={72} near={0.1} far={220} />
}

/* ------------------------------- Main Export ------------------------------ */
export default function CyberTunnel({ warpRef }) {
  return (
    <div className="fixed inset-0 z-0 bg-ink" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => gl.setClearColor('#020617')}
      >
        <fog attach="fog" args={['#020617', 16, 90]} />
        <CameraRig warpRef={warpRef} />
        <TunnelGrid warpRef={warpRef} />
        <ParticleField warpRef={warpRef} />
        <LightStreaks warpRef={warpRef} />
      </Canvas>
    </div>
  )
}
