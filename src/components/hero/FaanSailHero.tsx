'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import GlobeBackground from '@/components/hero/GlobeBackground'

// ── Team (mirrors /team) — rendered as an animated scroll section on the landing.
const TEAM = [
  { name: 'Yi-Chen Hsu',      role: 'Engineering',                  study: 'Computer Science · NTHU → TUM',       github: 'https://github.com/gunjyo0817', linkedin: 'https://www.linkedin.com/in/yichenhsu/' },
  { name: 'Lorenz Huber',     role: 'Engineering · Design',         study: 'Architecture · UCL London',           github: 'https://github.com/LCS3002',    linkedin: 'https://www.linkedin.com/in/huberlorenz' },
  { name: 'Miloš Preradović', role: 'Concept · Business · Rollout', study: 'Economics & Engineering · TU Vienna', github: 'https://github.com/prmilos',    linkedin: 'https://www.linkedin.com/in/milo%C5%A1-preradovi%C4%87-9a0329387/' },
  { name: 'John Yu',          role: 'Concept · Business · Design',  study: 'London · from Korea',                 github: '',                              linkedin: 'https://www.linkedin.com/in/john-yu-759490383/' },
] as const

const GH_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
)
const LI_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
)

/* FaanSail — institutional payment-infrastructure landing hero.
   Light white/grey, near-black text, HSBC-red accent used sparingly.
   A React-Three-Fiber voxel globe (the "earth") sits offset to the right
   over GlobeBackground (fixed animated line-field, z-index -1). The Meridian
   cargo ship is removed; only the Africa–China value corridor remains.
   Self-contained styles via a scoped <style> block + inline tokens so this
   file owns nothing in landing.css / globals.css. Design tokens
   (--bg-base, --accent, --text-1/2/3, --font-hero/ui/mono) come from
   :root in globals.css — see src/lib/types.ts. */

const REPO_URL = 'https://github.com/LCS3002/eu-hk-hack-munich'

const CREDENTIALS = [
  'SETTLES IN SECONDS',
  '0 RECONCILIATION BREAKS',
  'COMPLIANCE-GATED',
] as const

// Corridor cities (value-flow, not a route): Lagos → Hong Kong → Shenzhen.
// Only Lagos + Hong Kong are LABELLED. Shenzhen (~20km from HK) is an arc-only
// waypoint so the value line reaches the full Africa→China span without a
// label that would overlap Hong Kong's.
const LAGOS     = { name: 'LAGOS',     sub: 'APAPA PORT',      coord: '6.45°N   3.38°E',   tag: 'ORIGIN',   lat: 6.45,  lon: 3.38   } as const
const HONG_KONG = { name: 'HONG KONG', sub: 'SETTLEMENT RAIL', coord: '22.30°N  114.17°E', tag: 'CLEARING', lat: 22.30, lon: 114.17 } as const
const SHENZHEN  = { lat: 22.48, lon: 113.91 } as const
// Full arc path (the CatmullRom curve runs through all three points).
const CORRIDOR_PATH = [LAGOS, HONG_KONG, SHENZHEN] as const
// Only these two are labelled.
const CORRIDOR = [LAGOS, HONG_KONG] as const

// Resting orientation (Euler XYZ) that brings BOTH Lagos and Hong Kong to the
// front of the globe — Lagos on the left, HK on the right, equal depth — so the
// Africa→East-Asia corridor faces the viewer and HK is clearly visible.
const REST_X = 0.35
const REST_Y = 2.15
const REST_Z = 0.05

// ── Geo helpers ───────────────────────────────────────────────────────────────
const isLand = (phi: number, theta: number) => {
  const lat = 90 - (phi * 180 / Math.PI)
  let lon = (theta * 180 / Math.PI) - 180
  if (lon < -180) lon += 360
  if (lon > 180) lon -= 360
  const landmasses = [
    { lat: 65, lon: -150, r: 12 }, { lat: 60, lon: -110, r: 18 },
    { lat: 55, lon: -80, r: 18 },  { lat: 40, lon: -115, r: 12 },
    { lat: 38, lon: -90, r: 12 },  { lat: 20, lon: -100, r: 10 },
    { lat: 5, lon: -65, r: 14 },   { lat: -15, lon: -55, r: 14 },
    { lat: -40, lon: -65, r: 10 }, { lat: 50, lon: 10, r: 10 },
    { lat: 60, lon: 20, r: 10 },   { lat: 42, lon: -5, r: 5 },
    { lat: 20, lon: 0, r: 12 },    { lat: 20, lon: 30, r: 12 },
    { lat: 0, lon: 20, r: 15 },    { lat: -20, lon: 20, r: 12 },
    { lat: 60, lon: 80, r: 20 },   { lat: 60, lon: 120, r: 20 },
    { lat: 35, lon: 100, r: 18 },  { lat: 25, lon: 80, r: 10 },
    { lat: 30, lon: 50, r: 12 },   { lat: 15, lon: 100, r: 8 },
    { lat: -25, lon: 135, r: 15 }, { lat: -40, lon: 175, r: 5 },
    { lat: -5, lon: 115, r: 5 },   { lat: -5, lon: 145, r: 5 },
    { lat: 75, lon: -40, r: 10 },  { lat: -80, lon: 0, r: 25 },
    { lat: -80, lon: 120, r: 25 }, { lat: -80, lon: -120, r: 25 },
  ]
  const rad = Math.PI / 180
  for (const land of landmasses) {
    const dLat = Math.abs(lat - land.lat)
    const dLon = Math.abs(lon - land.lon)
    const dist = Math.sqrt(dLat * dLat + (dLon * Math.cos(lat * rad)) ** 2)
    const noise = (Math.sin(lat * 0.5) + Math.cos(lon * 0.5)) * 2
    if (dist < land.r + noise) return true
  }
  return false
}

function latLonToVec(lat: number, lon: number, r: number): [number, number, number] {
  const phi   = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return [
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.cos(theta),
  ]
}

// ── City marker — two styles, plain transparency (no AdditiveBlending) ────────
//   hub=false (Lagos): a single small red dot, gently pulsing.
//   hub=true  (Hong Kong): the settlement hub — a larger center dot plus two
//   pulsing concentric rings, clearly distinct from the plain origin dot.
function CityMarker({ lat, lon, radius, hub = false }: { lat: number; lon: number; radius: number; hub?: boolean }) {
  const dotRef = useRef<THREE.Mesh>(null)
  const ring1  = useRef<THREE.Mesh>(null)
  const ring2  = useRef<THREE.Mesh>(null)
  const pos = useMemo(() => latLonToVec(lat, lon, radius + 0.10), [lat, lon, radius])
  const outward = useMemo(() => new THREE.Vector3(...pos).normalize().multiplyScalar(999), [pos])

  useEffect(() => {
    ring1.current?.lookAt(outward)
    ring2.current?.lookAt(outward)
  }, [outward])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (dotRef.current) {
      const mat = dotRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.75 + 0.25 * Math.sin(t * 3.0)
    }
    if (ring1.current) {
      const mat = ring1.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.45 + 0.30 * Math.sin(t * 2.5 + 0.5)
      ring1.current.scale.setScalar(1.0 + 0.14 * Math.sin(t * 2.5))
    }
    if (ring2.current) {
      const mat = ring2.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.30 + 0.20 * Math.sin(t * 2.0 + 1.0)
      ring2.current.scale.setScalar(1.0 + 0.22 * Math.sin(t * 2.0 + 0.8))
    }
  })

  // Plain origin dot (Lagos).
  if (!hub) {
    return (
      <group position={pos}>
        <mesh ref={dotRef}>
          <sphereGeometry args={[0.034, 10, 10]} />
          <meshBasicMaterial color="#c1121f" transparent opacity={0.95} />
        </mesh>
      </group>
    )
  }

  // Settlement hub (Hong Kong): bigger dot + two pulsing concentric rings.
  return (
    <group position={pos}>
      <mesh ref={dotRef}>
        <sphereGeometry args={[0.052, 12, 12]} />
        <meshBasicMaterial color="#c1121f" transparent opacity={0.98} />
      </mesh>
      <mesh ref={ring1}>
        <torusGeometry args={[0.085, 0.009, 8, 40]} />
        <meshBasicMaterial color="#c1121f" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <mesh ref={ring2}>
        <torusGeometry args={[0.145, 0.006, 8, 40]} />
        <meshBasicMaterial color="#c1121f" transparent opacity={0.32} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ── Corridor label card (light) — static, no ship / route-progress logic ───────
//   The Hong Kong label (hub=true) is anchored right AT the marker's 3D coords
//   and nudged downward in screen space so the card sits just under the hub —
//   it no longer floats away from the actual marker.
function CorridorLabel({ city, radius, hub = false }: { city: typeof CORRIDOR[number]; radius: number; hub?: boolean }) {
  // Hub label anchors at the marker surface (tight); origin label sits further out.
  const pos = useMemo(() => {
    const [x, y, z] = latLonToVec(city.lat, city.lon, radius + (hub ? 0.12 : 0.52))
    return new THREE.Vector3(x, y, z)
  }, [city, radius, hub])

  return (
    <Html position={pos} center distanceFactor={6} zIndexRange={[20, 0]}>
      <div
        style={{
          fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
          pointerEvents: 'none',
          userSelect: 'none',
          minWidth: hub ? 178 : 170,
          // Hub: push the card down so it sits right under the HK marker.
          transform: hub ? 'translateY(58px)' : 'none',
        }}
      >
        {/* Hub: connector points UP from the card to the marker above it. */}
        {hub && (
          <>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c1121f', boxShadow: '0 0 6px rgba(193,18,31,0.6)', margin: '0 auto' }} />
            <div style={{ width: 1, height: 12, background: 'linear-gradient(to top, rgba(0,0,0,0.18), transparent)', margin: '0 auto' }} />
          </>
        )}
        <div style={{
          background: 'rgba(255,255,255,0.96)',
          borderTop: hub ? '2px solid #c1121f' : '1px solid rgba(0,0,0,0.10)',
          borderRight: '1px solid rgba(0,0,0,0.10)',
          borderBottom: '1px solid rgba(0,0,0,0.10)',
          borderLeft: '1px solid rgba(0,0,0,0.10)',
          clipPath: 'polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)',
          boxShadow: '0 6px 18px rgba(0,0,0,0.10)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 9px 4px' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#1a1a1a', letterSpacing: '0.12em' }}>
              {city.name}
            </span>
            <span style={{
              fontSize: 7, color: '#c1121f', letterSpacing: '0.1em',
              background: 'rgba(193,18,31,0.08)',
              borderTop: '1px solid rgba(193,18,31,0.25)',
              borderRight: '1px solid rgba(193,18,31,0.25)',
              borderBottom: '1px solid rgba(193,18,31,0.25)',
              borderLeft: '1px solid rgba(193,18,31,0.25)',
              padding: '1px 5px', borderRadius: 2,
            }}>
              {city.tag}
            </span>
          </div>
          <div style={{ padding: '5px 9px 6px' }}>
            <div style={{ fontSize: 8, color: '#595959', letterSpacing: '0.1em', marginBottom: 4 }}>
              {city.sub}
            </div>
            <div style={{ fontSize: 7, color: 'rgba(193,18,31,0.65)', letterSpacing: '0.08em' }}>
              {city.coord}
            </div>
          </div>
        </div>
        {/* Origin (Lagos): connector points DOWN from the card to the marker. */}
        {!hub && (
          <>
            <div style={{ width: 1, height: 12, background: 'linear-gradient(to bottom, rgba(0,0,0,0.18), transparent)', margin: '0 auto' }} />
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#c1121f', boxShadow: '0 0 6px rgba(193,18,31,0.6)', margin: '0 auto' }} />
          </>
        )}
      </div>
    </Html>
  )
}

// ── Static corridor arc (value-flow line Lagos → Hong Kong → Shenzhen) ────────
// All three points feed the CatmullRom curve so a clearly visible red line spans
// the full Africa→China corridor through Hong Kong, lifted off the surface.
function CorridorArc({ radius }: { radius: number }) {
  const geometry = useMemo(() => {
    const pts = CORRIDOR_PATH.map(c => new THREE.Vector3(...latLonToVec(c.lat, c.lon, radius + 0.06)))
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4)
    // Lift the arc slightly off the surface so it reads as a corridor, not a coastline
    const sampled = curve.getPoints(140).map((p, i, arr) => {
      const f = i / (arr.length - 1)
      const lift = 1 + 0.06 * Math.sin(Math.PI * f)
      return p.clone().multiplyScalar(lift)
    })
    return new THREE.BufferGeometry().setFromPoints(sampled)
  }, [radius])

  return (
    <line>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial color="#c1121f" transparent opacity={0.7} />
    </line>
  )
}

// ── Voxel globe (the "earth") — light-themed ──────────────────────────────────
function VoxelGlobe({ isMobile, booting }: { isMobile: boolean; booting: boolean }) {
  const groupRef     = useRef<THREE.Group>(null)
  const meshRef      = useRef<THREE.InstancedMesh>(null)
  const radius       = 2
  const resolution   = 80
  const bootingRef   = useRef(false)
  const bootStartRef = useRef(-1)
  const { camera }   = useThree()

  const { positions, colors } = useMemo(() => {
    const pos: number[] = []
    const col: number[] = []
    const colorLand  = new THREE.Color('#334155')  // charcoal/slate land (DARKER)
    const colorOcean = new THREE.Color('#cbd5e1')  // light-grey ocean speckle
    for (let i = 0; i < resolution; i++) {
      const phi  = Math.acos(-1 + (2 * i) / resolution)
      const latC = 2 * Math.PI * Math.sin(phi)
      const thetaCount = Math.floor(latC * resolution / Math.PI)
      for (let j = 0; j < thetaCount; j++) {
        const theta = (2 * Math.PI * j) / thetaCount
        const land = isLand(phi, theta)
        const x = radius * Math.sin(phi) * Math.sin(theta)
        const y = radius * Math.cos(phi)
        const z = radius * Math.sin(phi) * Math.cos(theta)
        pos.push(x, y, z)
        if (land) {
          col.push(colorLand.r, colorLand.g, colorLand.b)
        } else {
          if (Math.random() > 0.82) {
            col.push(colorOcean.r, colorOcean.g, colorOcean.b)
          } else {
            pos.pop(); pos.pop(); pos.pop()
          }
        }
      }
    }
    return { positions: new Float32Array(pos), colors: new Float32Array(col) }
  }, [])

  useEffect(() => {
    if (!meshRef.current) return
    const tmp   = new THREE.Object3D()
    const count = positions.length / 3
    for (let i = 0; i < count; i++) {
      tmp.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
      tmp.lookAt(0, 0, 0)
      // Land is now the DARKER colour — invert the original (colors[i*3] > 0.1) test.
      const isLandPt = colors[i * 3] < 0.5
      const s = isLandPt ? 0.032 : 0.014
      tmp.scale.set(s, s, s * (isLandPt ? 1.5 : 0.5))
      tmp.updateMatrix()
      meshRef.current.setMatrixAt(i, tmp.matrix)
      meshRef.current.setColorAt(i, new THREE.Color(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]))
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  }, [positions, colors])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    // Resting orientation biased so the Lagos→Hong Kong corridor faces the
    // viewer (HK clearly visible). Instead of a full spin that would carry the
    // corridor to the back, gently oscillate around the front-facing yaw.
    void delta
    groupRef.current.rotation.x = REST_X
    groupRef.current.rotation.z = REST_Z
    groupRef.current.rotation.y = REST_Y + Math.sin(state.clock.elapsedTime * 0.16) * 0.18

    if (booting && !bootingRef.current) {
      bootingRef.current = true
      bootStartRef.current = state.clock.elapsedTime
    }
    if (bootingRef.current) {
      const elapsed  = state.clock.elapsedTime - bootStartRef.current
      const progress = Math.min(elapsed / 1.8, 1)
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2
      const cam = camera as THREE.PerspectiveCamera
      cam.position.z = THREE.MathUtils.lerp(5.5, 0.2, eased)
      cam.updateProjectionMatrix()
      const sc = 1 + eased * 0.3
      groupRef.current.scale.setScalar(sc)
      return
    }

    const t  = (typeof window !== 'undefined' ? window.scrollY : 0) * 0.0015
    const tx = isMobile ? 0   : 2.5 + Math.sin(t) * 0.5
    const ty = isMobile ? 1.2 : Math.cos(t * 0.7) * 0.2
    const tz = isMobile ? -1  : -Math.sin(t * 0.5) * 0.3
    const sc = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.02
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, tx, 0.05)
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, ty, 0.05)
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, tz, 0.05)
    groupRef.current.scale.set(sc, sc, sc)
  })

  return (
    <group ref={groupRef} position={[2.5, 0, 0]} rotation={[REST_X, REST_Y, REST_Z]}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, positions.length / 3]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* Inner sphere — soft light fill so gaps read clean */}
      <mesh>
        <sphereGeometry args={[1.92, 32, 32]} />
        <meshBasicMaterial color="#eef2f6" transparent opacity={0.92} />
      </mesh>

      {/* Atmosphere halo — soft HSBC red, plain transparency (no AdditiveBlending) */}
      <mesh>
        <sphereGeometry args={[2.06, 32, 32]} />
        <meshBasicMaterial color="#c1121f" transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>

      <CorridorArc radius={radius} />

      {/* Lagos: plain origin dot. Hong Kong: distinct settlement hub. */}
      <CityMarker lat={LAGOS.lat} lon={LAGOS.lon} radius={radius} />
      <CityMarker lat={HONG_KONG.lat} lon={HONG_KONG.lon} radius={radius} hub />

      {/* Labels: only Lagos + Hong Kong (HK anchored under its marker). */}
      <CorridorLabel city={LAGOS} radius={radius} />
      <CorridorLabel city={HONG_KONG} radius={radius} hub />
    </group>
  )
}

export default function FaanSailHero({ onEnter }: { onEnter: () => void }) {
  const [isMobile, setIsMobile] = useState(false)
  const [booting, setBooting]   = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleEnter = () => {
    setBooting(true)
    // Let the globe drift in before handing off to the console.
    setTimeout(() => onEnter(), 900)
  }

  return (
    <div className="fs-page">
      <GlobeBackground />

      {/* Voxel globe (the "earth"), offset to the right, behind the copy */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <Canvas camera={{ position: [0, 0, 5.5], fov: 45 }} gl={{ alpha: true, antialias: true }}>
          <ambientLight intensity={0.7} />
          <VoxelGlobe isMobile={isMobile} booting={booting} />
        </Canvas>
      </div>

      <section className="fs-hero">
        <div
          className="fs-content"
          style={{
            transition: 'opacity 0.8s ease, transform 0.8s ease',
            opacity: booting ? 0 : 1,
            transform: booting ? 'translateY(-16px)' : 'translateY(0)',
          }}
        >
          <div className="fs-eyebrow">
            <span className="fs-eyebrow-rule" />
            COMPLIANCE-NATIVE STABLECOIN SETTLEMENT · THE HONG KONG CORRIDOR
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 1.6vw, 22px)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="FaanSail" style={{ display: 'block', height: 'clamp(56px, 8.6vw, 110px)', width: 'auto', flexShrink: 0 }} />
            <h1 className="fs-wordmark">FAANSAIL</h1>
          </div>

          <h2 className="fs-headline">
            Mitigate liquidity and compliance risk across the{' '}
            <span className="fs-headline-accent">Hong Kong</span> settlement corridor.
          </h2>

          <p className="fs-sub">
            A deterministic compliance gate verifies the trade (invoice vs bill of lading), a
            smart-contract escrow enforces the verdict, and settlement clears in
            seconds on the regulated stablecoin rail Hong Kong just licensed &mdash;
            the bad trade refused before a cent moves, every ledger reconciled off
            one event. Proven live on the Africa&ndash;China corridor &mdash; the hardest one.
          </p>

          <div className="fs-creds">
            {CREDENTIALS.map((c, i) => (
              <span className="fs-cred" key={c}>
                {i > 0 && <span className="fs-cred-dot" aria-hidden="true">·</span>}
                <span className="fs-cred-text">{c}</span>
              </span>
            ))}
          </div>

          <div className="fs-cta-row">
            <button type="button" className="fs-cta" onClick={handleEnter}>
              ENTER CONSOLE
            </button>
            <a href="/pitch" className="fs-cta-secondary">
              BUSINESS PITCH
            </a>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="fs-cta-secondary"
            >
              VIEW REPO
            </a>
          </div>

          <a href="#team" className="fs-scrollcue" aria-label="Meet the team">
            <span>MEET THE TEAM</span>
            <span className="fs-scrollcue-arrow" aria-hidden="true">↓</span>
          </a>
        </div>
      </section>

      {/* ── Team — animated scroll section (the globe stays fixed behind) ── */}
      <section id="team" className="fs-team">
        <motion.div
          className="fs-team-head"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="fs-team-eyebrow">
            <span className="fs-eyebrow-rule" />
            BUILT AT THE EU × HONG KONG FINTECH HACKATHON
          </div>
          <h2 className="fs-team-title">The team behind FaanSail</h2>
          <p className="fs-team-sub">
            Four builders across engineering, design and business — we shipped the
            whole settlement system live on Sepolia during the hackathon.
          </p>
        </motion.div>

        <div className="fs-team-grid">
          {TEAM.map((p, i) => (
            <motion.div
              key={p.name}
              className="fs-team-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div className="fs-team-role">{p.role}</div>
              <div className="fs-team-name">{p.name}</div>
              <div className="fs-team-study">{p.study}</div>
              <div className="fs-team-links">
                <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="fs-team-link">
                  {LI_ICON} LinkedIn
                </a>
                {p.github && (
                  <a href={p.github} target="_blank" rel="noopener noreferrer" className="fs-team-link">
                    {GH_ICON} GitHub
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="fs-team-foot"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <a href="/pitch" className="fs-cta-secondary">BUSINESS PITCH</a>
          <button type="button" className="fs-cta" onClick={handleEnter}>ENTER CONSOLE</button>
        </motion.div>
      </section>

      <style>{`
        .fs-page {
          min-height: 100vh;
          background: transparent;
          color: var(--text-1, #1a1a1a);
          font-family: var(--font-ui, 'Inter', sans-serif);
          position: relative;
          overflow-x: hidden;
        }

        .fs-hero {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          min-height: 100vh;
          padding: 96px 80px;
          box-sizing: border-box;
          pointer-events: none;
        }

        .fs-content {
          width: 100%;
          max-width: 700px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          pointer-events: auto;
        }

        /* ── Eyebrow ── */
        .fs-eyebrow {
          display: flex;
          align-items: center;
          gap: 16px;
          font-family: var(--font-mono, 'JetBrains Mono', monospace);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: var(--accent, #c1121f);
          margin: 0 0 32px;
        }
        .fs-eyebrow-rule {
          width: 40px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(193,18,31,0.6));
        }

        /* ── Wordmark ── */
        .fs-wordmark {
          font-family: var(--font-hero, 'Space Grotesk', system-ui, sans-serif);
          font-size: clamp(56px, 9vw, 112px);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 0.92;
          color: #1a1a1a;
          margin: 0;
          /* upright wordmark — no skew (clean neobank look) */
        }

        /* ── Headline ── */
        .fs-headline {
          font-family: var(--font-ui, 'Inter', sans-serif);
          font-size: clamp(26px, 3.4vw, 40px);
          font-weight: 600;
          letter-spacing: -0.02em;
          line-height: 1.18;
          color: var(--text-1, #1a1a1a);
          max-width: 660px;
          margin: 36px 0 0;
        }
        .fs-headline-accent {
          color: var(--accent, #c1121f);
          white-space: nowrap;
        }

        /* ── Subcopy ── */
        .fs-sub {
          font-family: var(--font-ui, 'Inter', sans-serif);
          font-size: 16px;
          line-height: 1.7;
          color: var(--text-2, #595959);
          max-width: 600px;
          margin: 22px 0 0;
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(2px);
          padding: 4px 0;
        }

        /* ── Infra credentials ── */
        .fs-creds {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px 14px;
          margin: 34px 0 0;
          padding: 0;
        }
        .fs-cred {
          display: inline-flex;
          align-items: center;
          gap: 14px;
        }
        .fs-cred-dot {
          color: var(--text-3, #9a9a9a);
          font-size: 12px;
        }
        .fs-cred-text {
          font-family: var(--font-mono, 'JetBrains Mono', monospace);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--text-3, #9a9a9a);
        }

        /* ── CTA row ── */
        .fs-cta-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
          margin: 44px 0 0;
        }

        .fs-cta {
          font-family: var(--font-mono, 'JetBrains Mono', monospace);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #fff;
          background: var(--accent, #c1121f);
          border: none;
          padding: 18px 46px;
          cursor: pointer;
          transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
          clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
          box-shadow: 0 2px 12px rgba(193,18,31,0.20);
        }
        .fs-cta:hover {
          background: #a50f1a;
          box-shadow: 0 4px 20px rgba(193,18,31,0.28);
          transform: translateY(-2px);
        }
        .fs-cta:active { transform: translateY(0); }
        .fs-cta:focus-visible {
          outline: 2px solid var(--accent, #c1121f);
          outline-offset: 3px;
        }

        .fs-cta-secondary {
          font-family: var(--font-mono, 'JetBrains Mono', monospace);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          text-decoration: none;
          color: var(--text-2, #595959);
          background: var(--bg-surface, #fff);
          border: 1px solid var(--border-strong, rgba(0,0,0,0.14));
          padding: 17px 38px;
          cursor: pointer;
          transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease, transform 0.2s ease;
          clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
        }
        .fs-cta-secondary:hover {
          border-color: var(--accent, #c1121f);
          color: var(--accent, #c1121f);
          background: var(--accent-soft, rgba(193,18,31,0.08));
          transform: translateY(-2px);
        }
        .fs-cta-secondary:active { transform: translateY(0); }
        .fs-cta-secondary:focus-visible {
          outline: 2px solid var(--accent, #c1121f);
          outline-offset: 3px;
        }

        /* ── Scroll cue ── */
        .fs-scrollcue {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin: 40px 0 0;
          font-family: var(--font-mono, 'JetBrains Mono', monospace);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--text-3, #9a9a9a);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .fs-scrollcue:hover { color: var(--accent, #c1121f); }
        .fs-scrollcue-arrow {
          display: inline-block;
          animation: fs-bob 1.8s ease-in-out infinite;
        }
        @keyframes fs-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }

        /* ── Team scroll section ── */
        .fs-team {
          position: relative;
          z-index: 1;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 110px 80px;
          box-sizing: border-box;
          background: linear-gradient(to bottom, transparent, rgba(250,250,250,0.78) 18%, rgba(250,250,250,0.92) 100%);
        }
        .fs-team-head {
          width: 100%;
          max-width: 980px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 52px;
        }
        .fs-team-eyebrow {
          display: flex;
          align-items: center;
          gap: 14px;
          font-family: var(--font-mono, 'JetBrains Mono', monospace);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--accent, #c1121f);
          margin-bottom: 22px;
        }
        .fs-team-title {
          font-family: var(--font-hero, 'Space Grotesk', system-ui, sans-serif);
          font-size: clamp(30px, 4.4vw, 52px);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.08;
          color: var(--text-1, #1a1a1a);
          margin: 0;
        }
        .fs-team-sub {
          font-size: 15px;
          line-height: 1.7;
          color: var(--text-2, #595959);
          max-width: 560px;
          margin: 18px 0 0;
        }
        .fs-team-grid {
          width: 100%;
          max-width: 980px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 16px;
        }
        .fs-team-card {
          background: var(--bg-surface, #fff);
          border: 1px solid var(--border, rgba(0,0,0,0.08));
          border-top: 3px solid var(--accent, #c1121f);
          border-radius: 10px;
          padding: 26px 24px 22px;
          box-shadow: 0 8px 26px rgba(0,0,0,0.05);
        }
        .fs-team-role {
          font-family: var(--font-mono, 'JetBrains Mono', monospace);
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--accent, #c1121f);
          margin-bottom: 14px;
        }
        .fs-team-name {
          font-size: 19px;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: var(--text-1, #1a1a1a);
          margin-bottom: 6px;
        }
        .fs-team-study {
          font-size: 12px;
          line-height: 1.6;
          color: var(--text-2, #595959);
          margin-bottom: 22px;
        }
        .fs-team-links { display: flex; gap: 16px; }
        .fs-team-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-family: var(--font-mono, 'JetBrains Mono', monospace);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--text-3, #9a9a9a);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .fs-team-link:hover { color: var(--accent, #c1121f); }
        .fs-team-foot {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 16px;
          margin-top: 52px;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .fs-team { padding: 80px 22px; }
          .fs-hero { padding: 88px 22px; align-items: flex-start; }
          .fs-content {
            background: rgba(250, 250, 250, 0.82);
            backdrop-filter: blur(3px);
            padding: 22px;
          }
          .fs-wordmark { transform: skewX(0deg); font-size: clamp(46px, 14vw, 72px); }
          .fs-headline { font-size: clamp(24px, 6vw, 30px); }
          .fs-headline-accent { white-space: normal; }
          .fs-sub { font-size: 15px; background: transparent; }
          .fs-creds { gap: 6px 12px; }
          .fs-cta-row { width: 100%; }
          .fs-cta, .fs-cta-secondary {
            width: 100%;
            text-align: center;
            box-sizing: border-box;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .fs-cta, .fs-cta-secondary { transition: none; }
          .fs-cta:hover, .fs-cta-secondary:hover { transform: none; }
        }
      `}</style>
    </div>
  )
}
