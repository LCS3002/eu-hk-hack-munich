'use client'

// FaanSail — JourneyConsole (the centerpiece)
// A clean, institutional, 3D-globe-centered settlement console driven by the
// REAL /api/verify SSE stream. The globe (reused from FaanSailHero's VoxelGlobe)
// shows the Lagos → Hong Kong → Shenzhen corridor; a value pulse travels the arc
// in sync with the settlement phases. A single calm settlement panel on the right
// shows the trade, the AI verdict, and the on-chain (Etherscan) proof — the
// clickable links that prove this is real, not a mock.
//
// Reader loop is copied verbatim from VerdictStream:
//   POST /api/verify {scenarioId} → res.body.getReader() → TextDecoder →
//   split('\n') → parse `data:` lines into VerifyEvent.
//
// VerifyEvent shapes (frozen, see lib/types.ts):
//   { type:'text';    text }                                   → reasoning token
//   { type:'verdict'; result }                                 → CLEARED / BLOCKED
//   { type:'tx';      hash, status, chain, explorerUrl }       → settlement + Etherscan
//   { type:'error';   message }                                → soft error
//   { type:'done' }                                            → stream complete
//
// PROPS: { scenarioId: string | null; scenario: TradeScenario | null }
//   scenarioId non-null  → POST /api/verify and animate the corridor + panel.
//   scenarioId null      → idle: globe rotates quietly, panel shows a prompt.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type {
  VerifyEvent,
  ProofOfTradeResult,
  TradeScenario,
  PassportStatus,
  UploadedDocs,
} from '@/lib/types'

// ─── On-chain context (client-readable env) ────────────────────────────────
const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_BASE || 'https://sepolia.etherscan.io'
const BUYER = process.env.NEXT_PUBLIC_BUYER_ADDRESS || ''
const ESCROW = process.env.NEXT_PUBLIC_ESCROW_ADDRESS || ''
const SUPPLIER = process.env.NEXT_PUBLIC_SUPPLIER_ADDRESS || ''
const USDC = process.env.NEXT_PUBLIC_USDC_ADDRESS || ''

// ─── Corridor geography (Lagos → Hong Kong → Shenzhen) ─────────────────────
// HK and Shenzhen overlap on the globe — Shenzhen is the pulse's final hop but
// is NOT labelled (HK is the emphasized hub). Order matters: it's the arc path.
const LAGOS = { name: 'LAGOS', tag: 'ORIGIN', coord: '6.45°N 3.38°E', lat: 6.45, lon: 3.38 }
const HONG_KONG = { name: 'HONG KONG', tag: 'SETTLEMENT CORRIDOR', coord: '22.30°N 114.17°E', lat: 22.3, lon: 114.17 }
const SHENZHEN = { lat: 22.48, lon: 113.91 }
const CORRIDOR_PATH = [LAGOS, HONG_KONG, SHENZHEN] as const

// Resting orientation (Euler XYZ) that brings BOTH Lagos and Hong Kong to the
// front of the globe — Lagos on the left, HK on the right, equal depth — so the
// Africa→East-Asia corridor faces the viewer and HK is clearly visible.
const REST_X = 0.35
const REST_Y = 2.15
const REST_Z = 0.05

// ─── Phase state machine ───────────────────────────────────────────────────
//  idle      — no scenario: globe rotates quietly.
//  depart    — run kicked off; pulse departs Lagos, awaiting first event.
//  verifying — first 'text': reasoning streams; pulse en route toward HK gate.
//  cleared   — verdict CLEAR resolved (pulse holds at the HK gate).
//  blocked   — verdict BLOCK resolved (terminal: pulse stops at the HK gate).
//  settling  — tx SETTLED: pulse completes HK → Shenzhen; settlement reveals.
//  settled   — final CLEAR state; reconciled.
type Phase =
  | 'idle'
  | 'depart'
  | 'verifying'
  | 'cleared'
  | 'blocked'
  | 'settling'
  | 'settled'

interface TxInfo {
  hash: string
  status: PassportStatus
  chain: string
  explorerUrl: string | null
}

function truncHash(hash: string): string {
  if (hash.length <= 18) return hash
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`
}

function truncAddr(addr: string): string {
  if (!addr || addr.length <= 14) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`
}

// A longer truncation for the prominent wallet chips (more of the real address shown).
function truncAddrLong(addr: string): string {
  if (!addr || addr.length <= 20) return addr
  return `${addr.slice(0, 10)}…${addr.slice(-8)}`
}

function fmtAmount(n: number): string {
  return `$${n.toLocaleString('en-US')}`
}

// ════════════════════════════════════════════════════════════════════════
// GEO + GLOBE (adapted from FaanSailHero VoxelGlobe / CityMarker / CorridorArc)
// ════════════════════════════════════════════════════════════════════════

const isLand = (phi: number, theta: number) => {
  const lat = 90 - (phi * 180) / Math.PI
  let lon = (theta * 180) / Math.PI - 180
  if (lon < -180) lon += 360
  if (lon > 180) lon -= 360
  const landmasses = [
    { lat: 65, lon: -150, r: 12 }, { lat: 60, lon: -110, r: 18 },
    { lat: 55, lon: -80, r: 18 }, { lat: 40, lon: -115, r: 12 },
    { lat: 38, lon: -90, r: 12 }, { lat: 20, lon: -100, r: 10 },
    { lat: 5, lon: -65, r: 14 }, { lat: -15, lon: -55, r: 14 },
    { lat: -40, lon: -65, r: 10 }, { lat: 50, lon: 10, r: 10 },
    { lat: 60, lon: 20, r: 10 }, { lat: 42, lon: -5, r: 5 },
    { lat: 20, lon: 0, r: 12 }, { lat: 20, lon: 30, r: 12 },
    { lat: 0, lon: 20, r: 15 }, { lat: -20, lon: 20, r: 12 },
    { lat: 60, lon: 80, r: 20 }, { lat: 60, lon: 120, r: 20 },
    { lat: 35, lon: 100, r: 18 }, { lat: 25, lon: 80, r: 10 },
    { lat: 30, lon: 50, r: 12 }, { lat: 15, lon: 100, r: 8 },
    { lat: -25, lon: 135, r: 15 }, { lat: -40, lon: 175, r: 5 },
    { lat: -5, lon: 115, r: 5 }, { lat: -5, lon: 145, r: 5 },
    { lat: 75, lon: -40, r: 10 }, { lat: -80, lon: 0, r: 25 },
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
  const phi = (90 - lat) * (Math.PI / 180)
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
function CityMarker({
  lat,
  lon,
  radius,
  color,
  hub = false,
}: {
  lat: number
  lon: number
  radius: number
  color: string
  hub?: boolean
}) {
  const dotRef = useRef<THREE.Mesh>(null)
  const ring1 = useRef<THREE.Mesh>(null)
  const ring2 = useRef<THREE.Mesh>(null)
  const pos = useMemo(() => latLonToVec(lat, lon, radius + 0.1), [lat, lon, radius])
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
      mat.opacity = 0.45 + 0.3 * Math.sin(t * 2.5 + 0.5)
      ring1.current.scale.setScalar(1.0 + 0.14 * Math.sin(t * 2.5))
    }
    if (ring2.current) {
      const mat = ring2.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.3 + 0.2 * Math.sin(t * 2.0 + 1.0)
      ring2.current.scale.setScalar(1.0 + 0.22 * Math.sin(t * 2.0 + 0.8))
    }
  })

  // Plain origin dot (Lagos).
  if (!hub) {
    return (
      <group position={pos}>
        <mesh ref={dotRef}>
          <sphereGeometry args={[0.034, 10, 10]} />
          <meshBasicMaterial color={color} transparent opacity={0.95} />
        </mesh>
      </group>
    )
  }

  // Settlement hub (Hong Kong): bigger dot + two pulsing concentric rings.
  return (
    <group position={pos}>
      <mesh ref={dotRef}>
        <sphereGeometry args={[0.052, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.98} />
      </mesh>
      <mesh ref={ring1}>
        <torusGeometry args={[0.085, 0.009, 8, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <mesh ref={ring2}>
        <torusGeometry args={[0.145, 0.006, 8, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.32} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ── City label card (light, mono) — only LAGOS + HONG KONG are labelled ────
//   The Hong Kong label (hub=true) anchors right AT the marker's 3D coords and
//   is nudged down in screen space so it sits just under the hub — not floating
//   away. The Lagos label (hub=false) sits further out with a downward connector.
function CityLabel({
  city,
  radius,
  hub = false,
}: {
  city: typeof LAGOS | typeof HONG_KONG
  radius: number
  hub?: boolean
}) {
  const pos = useMemo(() => {
    const [x, y, z] = latLonToVec(city.lat, city.lon, radius + (hub ? 0.12 : 0.5))
    return new THREE.Vector3(x, y, z)
  }, [city, radius, hub])

  return (
    <Html position={pos} center distanceFactor={6} zIndexRange={[20, 0]}>
      <div
        style={{
          fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
          pointerEvents: 'none',
          userSelect: 'none',
          minWidth: hub ? 150 : 120,
          // Hub: push the card down so it sits right under the HK marker.
          transform: hub ? 'translateY(56px)' : 'none',
        }}
      >
        {/* Hub: connector points UP from the card to the marker above it. */}
        {hub && (
          <>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c1121f', boxShadow: '0 0 6px rgba(193,18,31,0.6)', margin: '0 auto' }} />
            <div style={{ width: 1, height: 12, background: 'linear-gradient(to top, rgba(0,0,0,0.18), transparent)', margin: '0 auto' }} />
          </>
        )}
        <div
          style={{
            background: 'rgba(255,255,255,0.97)',
            borderTop: hub ? '2px solid #c1121f' : '1px solid rgba(0,0,0,0.10)',
            borderRight: '1px solid rgba(0,0,0,0.10)',
            borderBottom: '1px solid rgba(0,0,0,0.10)',
            borderLeft: '1px solid rgba(0,0,0,0.10)',
            boxShadow: '0 6px 18px rgba(0,0,0,0.10)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              padding: '5px 9px 4px',
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: '#1a1a1a', letterSpacing: '0.12em' }}>
              {city.name}
            </span>
            <span
              style={{
                fontSize: 6.5,
                color: '#c1121f',
                letterSpacing: '0.1em',
                background: 'rgba(193,18,31,0.08)',
                borderTop: '1px solid rgba(193,18,31,0.25)',
                borderRight: '1px solid rgba(193,18,31,0.25)',
                borderBottom: '1px solid rgba(193,18,31,0.25)',
                borderLeft: '1px solid rgba(193,18,31,0.25)',
                padding: '1px 5px',
                whiteSpace: 'nowrap',
              }}
            >
              {city.tag}
            </span>
          </div>
          <div style={{ padding: '0 9px 5px' }}>
            <span style={{ fontSize: 7, color: 'rgba(193,18,31,0.65)', letterSpacing: '0.08em' }}>
              {city.coord}
            </span>
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

// ── Corridor arc (value-flow line) + animated value pulse ──────────────────
// `progress` is 0→1 along the Lagos→HK→Shenzhen path; `gateStop` halts the
// pulse partway (at the HK gate) when settlement is blocked.
function Corridor({
  radius,
  progress,
  blocked,
  active,
}: {
  radius: number
  progress: number
  blocked: boolean
  active: boolean
}) {
  const pulseRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  // Group wrapping the lit segment — toggling its visibility avoids attaching a
  // ref to the <line> intrinsic (which r3f v9 types as the DOM SVG line).
  const litGroupRef = useRef<THREE.Group>(null)

  const accent = '#c1121f'
  const green = '#15803d'
  // Lit-segment colour changes only on phase change → derive from props, no
  // per-frame material mutation. Red until fully settled, then green.
  const litColor = !blocked && progress >= 0.99 ? green : accent

  // Lifted catmull-rom curve through the three cities (matches hero arc style).
  const SEG = 140
  const curve = useMemo(() => {
    const pts = CORRIDOR_PATH.map(
      (c) => new THREE.Vector3(...latLonToVec(c.lat, c.lon, radius + 0.06))
    )
    return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4)
  }, [radius])

  const sampled = useMemo(() => {
    return curve.getPoints(SEG).map((p, i, arr) => {
      const f = i / (arr.length - 1)
      const lift = 1 + 0.06 * Math.sin(Math.PI * f)
      return p.clone().multiplyScalar(lift)
    })
  }, [curve])

  const baseGeometry = useMemo(
    () => new THREE.BufferGeometry().setFromPoints(sampled),
    [sampled]
  )

  // Lit geometry holds the FULL arc; we reveal it progressively via drawRange,
  // so no per-frame buffer rebuilds are needed.
  const litGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(sampled)
    g.setDrawRange(0, 0)
    return g
  }, [sampled])

  // Smooth the visible progress so the pulse glides rather than snaps.
  const shownRef = useRef(0)

  useFrame(() => {
    const target = active ? progress : 0
    shownRef.current += (target - shownRef.current) * 0.06
    const p = THREE.MathUtils.clamp(shownRef.current, 0, 1)

    // Position the pulse + glow along the lifted curve.
    if (pulseRef.current && glowRef.current) {
      const pt = curve.getPointAt(p)
      const lift = 1 + 0.06 * Math.sin(Math.PI * p)
      pt.multiplyScalar(lift)
      pulseRef.current.position.copy(pt)
      glowRef.current.position.copy(pt)
      const visible = active && p > 0.001
      pulseRef.current.visible = visible
      glowRef.current.visible = visible
    }

    // Reveal the travelled portion of the arc via drawRange.
    litGeometry.setDrawRange(0, Math.max(2, Math.floor(p * (sampled.length - 1))))
    if (litGroupRef.current) litGroupRef.current.visible = active && p > 0.005
  })

  return (
    <group>
      {/* Full corridor line — clearly visible Lagos → HK → Shenzhen span */}
      <line>
        <primitive object={baseGeometry} attach="geometry" />
        <lineBasicMaterial color={accent} transparent opacity={active ? 0.4 : 0.7} />
      </line>

      {/* Bright travelled segment (revealed via drawRange) */}
      <group ref={litGroupRef} visible={false}>
        <line>
          <primitive object={litGeometry} attach="geometry" />
          <lineBasicMaterial color={litColor} transparent opacity={0.95} />
        </line>
      </group>

      {/* Value pulse (glow halo) */}
      <mesh ref={glowRef} visible={false}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color={litColor} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      {/* Value pulse (bright core) */}
      <mesh ref={pulseRef} visible={false}>
        <sphereGeometry args={[0.032, 12, 12]} />
        <meshBasicMaterial color={litColor} transparent opacity={0.95} />
      </mesh>
    </group>
  )
}

// ── Voxel globe (the "earth") — light-themed, gently auto-rotating ─────────
function VoxelGlobe({
  progress,
  blocked,
  active,
}: {
  progress: number
  blocked: boolean
  active: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const radius = 2
  const resolution = 80

  const { positions, colors } = useMemo(() => {
    const pos: number[] = []
    const col: number[] = []
    const colorLand = new THREE.Color('#334155') // charcoal/slate land
    const colorOcean = new THREE.Color('#cbd5e1') // light-grey ocean speckle
    for (let i = 0; i < resolution; i++) {
      const phi = Math.acos(-1 + (2 * i) / resolution)
      const latC = 2 * Math.PI * Math.sin(phi)
      const thetaCount = Math.floor((latC * resolution) / Math.PI)
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
            pos.pop()
            pos.pop()
            pos.pop()
          }
        }
      }
    }
    return { positions: new Float32Array(pos), colors: new Float32Array(col) }
  }, [])

  useEffect(() => {
    if (!meshRef.current) return
    const tmp = new THREE.Object3D()
    const count = positions.length / 3
    for (let i = 0; i < count; i++) {
      tmp.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
      tmp.lookAt(0, 0, 0)
      const isLandPt = colors[i * 3] < 0.5
      const s = isLandPt ? 0.032 : 0.014
      tmp.scale.set(s, s, s * (isLandPt ? 1.5 : 0.5))
      tmp.updateMatrix()
      meshRef.current.setMatrixAt(i, tmp.matrix)
      meshRef.current.setColorAt(
        i,
        new THREE.Color(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2])
      )
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  }, [positions, colors])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    // Keep the Lagos→HK corridor facing the viewer (HK clearly visible) by gently
    // oscillating around the front-facing yaw instead of spinning fully around.
    // Swing is narrower while a settlement runs so the corridor holds steady.
    const amp = active ? 0.1 : 0.18
    groupRef.current.rotation.x = REST_X
    groupRef.current.rotation.z = REST_Z
    groupRef.current.rotation.y = REST_Y + Math.sin(clock.elapsedTime * 0.16) * amp
  })

  // Orient the group so the Lagos→HK corridor faces the camera, tilted for depth.
  return (
    <group ref={groupRef} rotation={[REST_X, REST_Y, REST_Z]}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, positions.length / 3]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* Inner sphere — soft light fill so gaps read clean */}
      <mesh>
        <sphereGeometry args={[1.92, 32, 32]} />
        <meshBasicMaterial color="#eef2f6" transparent opacity={0.92} />
      </mesh>

      {/* Atmosphere halo — soft HSBC red */}
      <mesh>
        <sphereGeometry args={[2.06, 32, 32]} />
        <meshBasicMaterial color="#c1121f" transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>

      <Corridor radius={radius} progress={progress} blocked={blocked} active={active} />

      {/* Lagos: plain origin dot. Hong Kong: distinct settlement hub. */}
      <CityMarker lat={LAGOS.lat} lon={LAGOS.lon} radius={radius} color="#c1121f" />
      <CityMarker lat={HONG_KONG.lat} lon={HONG_KONG.lon} radius={radius} color="#c1121f" hub />

      {/* Labels: only Lagos + Hong Kong (HK anchored under its marker). */}
      <CityLabel city={LAGOS} radius={radius} />
      <CityLabel city={HONG_KONG} radius={radius} hub />
    </group>
  )
}

// ════════════════════════════════════════════════════════════════════════
// CONSOLE
// ════════════════════════════════════════════════════════════════════════

export default function JourneyConsole({
  scenarioId,
  scenario,
  uploadedDocs,
  onUpload,
}: {
  scenarioId: string | null
  scenario: TradeScenario | null
  uploadedDocs?: UploadedDocs | null
  onUpload?: () => void
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<ProofOfTradeResult | null>(null)
  const [tx, setTx] = useState<TxInfo | null>(null)
  const [settleSecs, setSettleSecs] = useState<number | null>(null)
  const [confirmedBlock, setConfirmedBlock] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const startedForRef = useRef<string | null>(null)
  const runStartRef = useRef<number | null>(null)

  // On-chain finality: once a real Sepolia tx lands, poll its receipt and surface
  // the block it mined in ("Confirmed on-chain · block N"). Best-effort — a failed
  // poll never blocks the demo; the optimistic settled state already stands.
  useEffect(() => {
    if (!tx || tx.chain !== 'sepolia' || !tx.hash) return
    let cancelled = false
    let tries = 0
    const poll = async () => {
      if (cancelled) return
      tries++
      try {
        const r = await fetch(`/api/txstatus?hash=${tx.hash}`)
        const d = (await r.json()) as { mined: boolean; blockNumber: number | null }
        if (!cancelled && d.mined && d.blockNumber != null) {
          setConfirmedBlock(d.blockNumber)
          return
        }
      } catch {
        /* finality is a bonus — ignore and retry */
      }
      if (!cancelled && tries < 15) window.setTimeout(poll, 3000)
    }
    void poll()
    return () => {
      cancelled = true
    }
  }, [tx])

  useEffect(() => {
    // Cleared → reset to the calm idle state.
    if (!scenarioId) {
      abortRef.current?.abort()
      startedForRef.current = null
      runStartRef.current = null
      setPhase('idle')
      setResult(null)
      setTx(null)
      setSettleSecs(null)
      setConfirmedBlock(null)
      setError(null)
      return
    }
    // New (or re-triggered) scenario → start a fresh settlement.
    if (startedForRef.current === scenarioId) return
    startedForRef.current = scenarioId
    void runVerify(scenarioId, uploadedDocs ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId])

  const runVerify = async (id: string, docs: UploadedDocs | null) => {
    runStartRef.current = Date.now()
    setResult(null)
    setTx(null)
    setSettleSecs(null)
    setConfirmedBlock(null)
    setError(null)
    setPhase('depart')

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const body = docs
        ? JSON.stringify({ uploadedDocs: docs })
        : JSON.stringify({ scenarioId: id })

      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const raw = line.slice(5).trim()
          if (!raw || raw === '[DONE]') continue
          let evt: VerifyEvent
          try {
            evt = JSON.parse(raw) as VerifyEvent
          } catch {
            continue
          }
          handleEvent(evt)
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return
      // Soft error — keep the demo calm and never crash.
      setError('Settlement stream unavailable — check the API route / chain bridge.')
    }
  }

  const handleEvent = (evt: VerifyEvent) => {
    switch (evt.type) {
      case 'text':
        if (evt.text) {
          // First token from the gate → it's now actively verifying.
          setPhase((p) => (p === 'depart' ? 'verifying' : p))
        }
        break
      case 'verdict':
        setResult(evt.result)
        setPhase(evt.result.verdict === 'CLEAR' ? 'cleared' : 'blocked')
        break
      case 'tx': {
        setTx({
          hash: evt.hash,
          status: evt.status,
          chain: evt.chain,
          explorerUrl: evt.explorerUrl,
        })
        if (runStartRef.current) {
          setSettleSecs(Math.max(1, Math.round((Date.now() - runStartRef.current) / 1000)))
        }
        if (evt.status === 'SETTLED') {
          setPhase('settling')
          window.setTimeout(() => setPhase('settled'), 1800)
        } else {
          setPhase('blocked')
        }
        break
      }
      case 'error':
        setError(evt.message || 'Settlement error')
        setPhase((p) =>
          p === 'cleared' || p === 'blocked' || p === 'settling' || p === 'settled'
            ? p
            : 'idle'
        )
        break
      case 'done':
        break
    }
  }

  // ─── Derived view state ──────────────────────────────────────────────────
  const idle = phase === 'idle'
  const cleared = phase === 'cleared'
  const blocked = phase === 'blocked'
  const settling = phase === 'settling'
  const settled = phase === 'settled'
  const verifying = phase === 'verifying'
  const active = !idle

  // Value-pulse progress along Lagos(0) → HK(~0.5) → Shenzhen(1).
  // depart: just left Lagos; verifying/cleared/blocked: holds at the HK gate;
  // settling/settled: completes to Shenzhen.
  let pulseProgress = 0
  if (phase === 'depart') pulseProgress = 0.16
  else if (verifying) pulseProgress = 0.46
  else if (cleared || blocked) pulseProgress = 0.5
  else if (settling || settled) pulseProgress = 1

  // For a blocked run, the bright/lit arc must stop at the gate, not glow green.
  const pulseBlocked = blocked

  const buyerName = uploadedDocs?.buyerName ?? scenario?.invoice.buyerName ?? 'Importer'
  const supplierName = uploadedDocs?.supplierName ?? scenario?.invoice.supplierName ?? 'Supplier'
  const amount = uploadedDocs?.amount
    ? fmtAmount(uploadedDocs.amount)
    : scenario
    ? fmtAmount(scenario.amount)
    : null

  const failedChecks = result?.checks.filter((c) => c.status === 'FAIL') ?? []
  // The single AI summary line: all-clear, or the top failed flag.
  const summaryLine = result
    ? result.verdict === 'CLEAR'
      ? 'All cross-document checks passed'
      : result.flags[0] ?? failedChecks[0]?.detail ?? 'Cross-document checks failed'
    : null

  // Live status for each phase of the rail (the flow diagram across the top).
  const phaseStatuses: PStatus[] =
    phase === 'depart' || phase === 'verifying'
      ? ['done', 'active', 'pending', 'pending', 'pending']
      : phase === 'cleared'
        ? ['done', 'done', 'active', 'pending', 'pending']
        : phase === 'settling'
          ? ['done', 'done', 'done', 'active', 'pending']
          : phase === 'settled'
            ? ['done', 'done', 'done', 'done', confirmedBlock != null ? 'done' : 'active']
            : phase === 'blocked'
              ? ['done', 'refused', 'done', 'refused', 'pending']
              : ['pending', 'pending', 'pending', 'pending', 'pending']

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-base)',
        overflow: 'hidden',
      }}
    >
      <Styles />

      {/* ════════ Flow diagram — phase rail + live detail (the centerpiece) ════════ */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {idle ? (
          <IdleCenter onUpload={onUpload} />
        ) : (
          <div style={{ width: '100%', maxWidth: 860, padding: '26px 32px 18px', display: 'flex', flexDirection: 'column', gap: 22 }}>
            <PhaseRail statuses={phaseStatuses} />

            {phase === 'settled' ? (
              <PaymentComplete amount={amount} tx={tx} settleSecs={settleSecs} confirmedBlock={confirmedBlock} />
            ) : (
              <>
                {/* Payment lane — who pays whom, how much */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>{buyerName}</span>
                    <span style={{ color: 'var(--text-3)', fontSize: 12, flexShrink: 0 }}>→</span>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>{supplierName}</span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--text-1)', flexShrink: 0 }}>{amount}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.04em', color: 'var(--text-3)' }}>
                    {uploadedDocs
                      ? `${uploadedDocs.invoice.name} · ${uploadedDocs.billOfLading.name}`
                      : `Lagos → Shenzhen${scenario?.invoice.invoiceRef ? ` · ${scenario.invoice.invoiceRef}` : ''}${scenario?.invoice.hsCode ? ` · HS ${scenario.invoice.hsCode}` : ''}`
                    }
                  </span>
                </div>

                <Section label="AI Compliance Gate">
                  <DocumentPreview scenario={scenario} uploadedDocs={uploadedDocs ?? null} />
                  <VerdictBlock phase={phase} result={result} summaryLine={summaryLine} error={error} />
                </Section>

                <Section label="Settlement · stablecoin rail">
                  <SettlementBlock
                    phase={phase}
                    tx={tx}
                    settleSecs={settleSecs}
                    amount={amount}
                    blocked={blocked}
                    settling={settling}
                    settled={settled}
                    confirmedBlock={confirmedBlock}
                  />
                </Section>

                <ReconLine settled={settled} blocked={blocked} />
              </>
            )}
          </div>
        )}
      </div>

      {/* ════════ Globe peeking from the bottom-middle ════════ */}
      <div
        style={{
          position: 'relative',
          flex: '0 0 32%',
          minHeight: 0,
          overflow: 'hidden',
          borderTop: '1px solid var(--border)',
          background: 'radial-gradient(130% 150% at 50% 135%, #ffffff 0%, var(--bg-base) 55%, var(--bg-sunken) 100%)',
        }}
      >
        {/* corridor label, centered above the dome */}
        <div style={{ position: 'absolute', top: 13, left: '50%', transform: 'translateX(-50%)', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, pointerEvents: 'none' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--accent)' }}>Settlement corridor</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Lagos → Hong Kong → Shenzhen</span>
        </div>
        {/* the globe — large, anchored low so its top arc peeks up from the bottom */}
        <div style={{ position: 'absolute', left: '50%', bottom: '-60%', transform: 'translateX(-50%)', width: 'min(640px, 150%)', aspectRatio: '1 / 1', pointerEvents: 'none' }}>
          <Canvas camera={{ position: [0, 0, 5.4], fov: 42 }} gl={{ alpha: true, antialias: true }} style={{ position: 'absolute', inset: 0 }}>
            <ambientLight intensity={0.7} />
            <VoxelGlobe progress={pulseProgress} blocked={pulseBlocked} active={active} />
          </Canvas>
        </div>
      </div>
    </div>
  )
}

// ─── Idle panel ────────────────────────────────────────────────────────────
function IdleCenter({ onUpload }: { onUpload?: () => void }) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    // If files are dropped directly onto the idle panel, open the upload modal
    if (e.dataTransfer.files.length > 0 && onUpload) {
      onUpload()
    }
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 16,
        padding: '40px',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
        }}
      >
        Live Settlement Console
      </span>
      <span
        style={{
          fontFamily: 'var(--font-hero)',
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: '0.01em',
          lineHeight: 1.2,
          color: 'var(--text-1)',
        }}
      >
        Select a trade to settle.
      </span>
      <span
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          lineHeight: 1.7,
          color: 'var(--text-2)',
          maxWidth: 340,
        }}
      >
        An AI gate verifies the invoice against the bill of lading, settlement
        clears on-chain in seconds, and the buyer, supplier and regulator
        reconcile off one event.
      </span>

      {/* Upload drop zone */}
      {onUpload && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={onUpload}
          style={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            padding: '18px 32px',
            border: `1.5px dashed ${dragging ? '#c1121f' : 'rgba(0,0,0,0.15)'}`,
            background: dragging ? 'rgba(193,18,31,0.04)' : 'var(--bg-surface)',
            cursor: 'pointer',
            transition: 'border-color 0.18s ease, background 0.18s ease',
            minWidth: 280,
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>↑</span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#c1121f',
            }}
          >
            Upload your trade documents
          </span>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 11.5,
              color: 'var(--text-3)',
              lineHeight: 1.5,
              maxWidth: 220,
            }}
          >
            Drop invoice + bill of lading here, or click to upload. PDF, PNG, JPG, TXT.
          </span>
        </div>
      )}

      <div style={{ height: 1, width: 64, background: 'var(--border-strong)', margin: '4px 0' }} />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-3)',
        }}
      >
        Watch the value cross the Hong Kong corridor
      </span>
    </div>
  )
}

// ─── Document preview (key fields, side-by-side, mismatches highlighted) ──
function DocumentPreview({
  scenario,
  uploadedDocs,
}: {
  scenario: TradeScenario | null
  uploadedDocs: UploadedDocs | null
}) {
  if (!scenario && !uploadedDocs) return null

  // Upload flow — show filenames only (no structured fields to compare yet)
  if (uploadedDocs && !scenario) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 12,
        }}
      >
        {[
          { label: 'Invoice', doc: uploadedDocs.invoice },
          { label: 'Bill of Lading', doc: uploadedDocs.billOfLading },
        ].map(({ label, doc }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 13px',
              background: 'var(--bg-sunken)',
              border: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>
              {doc.mediaType === 'image' ? '🖼' : doc.mediaType === 'pdf' ? '📑' : '📄'}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 7.5,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  color: 'var(--text-1)',
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {doc.name}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8.5,
                  color: 'var(--text-3)',
                  letterSpacing: '0.06em',
                }}
              >
                {doc.mediaType === 'image' ? 'Claude Vision'
                  : doc.mediaType === 'pdf' ? 'Claude Document'
                  : 'Text extraction'}
              </span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!scenario) return null

  const inv = scenario.invoice
  const bol = scenario.billOfLading
  const hist = scenario.supplierHistory

  // Mismatch detection
  const qtyMismatch = inv.quantity !== bol.quantity
  const valueMismatch = hist.avgDeclaredValue > 0 &&
    inv.declaredValue > hist.avgDeclaredValue * 1.2
  const beneficiaryMismatch = hist.knownBeneficiaryAccount !== inv.beneficiaryAccount
  const hsMatch = inv.hsCode === bol.hsCode
  // Ship date vs payment terms: extract "ship on/before YYYY-MM-DD" from paymentTerms
  const shipDeadlineMatch = inv.paymentTerms.match(/(\d{4}-\d{2}-\d{2})/)
  const shipDeadline = shipDeadlineMatch?.[1]
  const shipDateLate = shipDeadline ? bol.shipDate > shipDeadline : false

  type FieldRow = { key: string; invVal: string; bolVal: string; mismatch: boolean }

  const rows: FieldRow[] = [
    {
      key: 'Reference',
      invVal: inv.invoiceRef,
      bolVal: bol.blRef,
      mismatch: false,
    },
    {
      key: 'Quantity',
      invVal: `${inv.quantity.toLocaleString()} pcs`,
      bolVal: `${bol.quantity.toLocaleString()} pcs`,
      mismatch: qtyMismatch,
    },
    {
      key: 'HS Code',
      invVal: inv.hsCode,
      bolVal: bol.hsCode,
      mismatch: !hsMatch,
    },
    {
      key: 'Declared Value',
      invVal: `$${inv.declaredValue.toLocaleString()} (${inv.unitPrice}/unit)`,
      bolVal: `Avg: $${hist.avgDeclaredValue.toLocaleString()}`,
      mismatch: valueMismatch,
    },
    {
      key: 'Beneficiary',
      invVal: `${inv.beneficiaryAccount} · ${inv.beneficiaryBank}`,
      bolVal: `Known: ${hist.knownBeneficiaryAccount}`,
      mismatch: beneficiaryMismatch,
    },
    {
      key: 'Ship Date',
      invVal: `Deadline: ${shipDeadline ?? '—'}`,
      bolVal: bol.shipDate,
      mismatch: shipDateLate,
    },
  ]

  const anyMismatch = rows.some((r) => r.mismatch)

  return (
    <div
      style={{
        marginBottom: 12,
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      {/* Column headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr 1fr',
          background: 'var(--bg-sunken)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ padding: '7px 12px' }} />
        {['Invoice', 'Bill of Lading'].map((h) => (
          <div
            key={h}
            style={{
              padding: '7px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: 7.5,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              borderLeft: '1px solid var(--border)',
            }}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Field rows */}
      {rows.map((row, i) => {
        const red = 'var(--blocked)'
        const bg = row.mismatch ? 'rgba(193,18,31,0.04)' : 'transparent'
        return (
          <div
            key={row.key}
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr 1fr',
              background: bg,
              borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
              transition: 'background 0.2s ease',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: 8.5,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: row.mismatch ? red : 'var(--text-3)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {row.mismatch && (
                <span style={{ color: red, fontSize: 10, lineHeight: 1 }}>✕</span>
              )}
              {row.key}
            </div>
            {[row.invVal, row.bolVal].map((val, ci) => (
              <div
                key={ci}
                style={{
                  padding: '8px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  color: row.mismatch ? red : 'var(--text-1)',
                  fontWeight: row.mismatch ? 600 : 400,
                  borderLeft: '1px solid var(--border)',
                  lineHeight: 1.4,
                }}
              >
                {val}
              </div>
            ))}
          </div>
        )
      })}

      {/* Summary footer */}
      {anyMismatch && (
        <div
          style={{
            padding: '6px 12px',
            background: 'rgba(193,18,31,0.06)',
            borderTop: '1px solid rgba(193,18,31,0.2)',
            fontFamily: 'var(--font-mono)',
            fontSize: 8.5,
            color: 'var(--blocked)',
            letterSpacing: '0.06em',
          }}
        >
          {rows.filter((r) => r.mismatch).length} cross-document discrepanc{rows.filter((r) => r.mismatch).length > 1 ? 'ies' : 'y'} detected
        </div>
      )}
    </div>
  )
}

// ─── Section wrapper (label + content) ─────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-3)',
        }}
      >
        {label}
      </span>
      {children}
    </div>
  )
}

// ─── AI verdict block ──────────────────────────────────────────────────────
function VerdictBlock({
  phase,
  result,
  summaryLine,
  error,
}: {
  phase: Phase
  result: ProofOfTradeResult | null
  summaryLine: string | null
  error: string | null
}) {
  const verifying = phase === 'verifying' || phase === 'depart'
  const cleared = result?.verdict === 'CLEAR'

  // Resolved verdict — large CLEARED / BLOCKED state.
  if (result) {
    const color = cleared ? 'var(--cleared)' : 'var(--blocked)'
    const soft = cleared ? 'rgba(21,128,61,0.07)' : 'var(--accent-soft)'
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '12px 16px',
            background: soft,
            borderTop: `1px solid ${color}`,
            borderRight: `1px solid ${color}`,
            borderBottom: `1px solid ${color}`,
            borderLeft: `3px solid ${color}`,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-hero)',
              fontSize: 24,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '0.03em',
              color,
            }}
          >
            {cleared ? 'CLEARED' : 'BLOCKED'}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--text-3)',
              }}
            >
              Risk
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, lineHeight: 1, color }}>
              {result.riskScore}
            </span>
          </div>
        </div>

        {/* ONE summary line */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
          <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, lineHeight: 1.4, flexShrink: 0 }}>
            {cleared ? '✓' : '✗'}
          </span>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, lineHeight: 1.5, color: 'var(--text-1)' }}>
            {summaryLine}
          </span>
        </div>
      </div>
    )
  }

  // Soft error (before any verdict).
  if (error) {
    return (
      <div
        style={{
          padding: '12px 14px',
          background: 'var(--accent-soft)',
          borderLeft: '3px solid var(--accent)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          lineHeight: 1.6,
          color: 'var(--text-2)',
        }}
      >
        {error}
      </div>
    )
  }

  // Verifying — a calm one-line status, NOT a chat. The verdict is what matters
  // and it lands in a couple of seconds; the money flow below is the focus.
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '13px 16px',
        background: 'var(--bg-sunken)',
        borderLeft: '3px solid var(--accent)',
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', animation: 'fs-pulse 1.3s ease-in-out infinite', flexShrink: 0 }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--text-2)' }}>
        {verifying ? 'Verifying invoice against bill of lading…' : 'Standby'}
      </span>
    </div>
  )
}

// ─── On-chain settlement block (the clickable proof) ───────────────────────
function SettlementBlock({
  phase,
  tx,
  settleSecs,
  amount,
  blocked,
  settling,
  settled,
  confirmedBlock,
}: {
  phase: Phase
  tx: TxInfo | null
  settleSecs: number | null
  amount: string | null
  blocked: boolean
  settling: boolean
  settled: boolean
  confirmedBlock: number | null
}) {
  const fundsThrough = settling || settled

  // BLOCKED → refused. Funds were deposited then held; the release is refused
  // on-chain. Show the same flow so the refusal is just as visible as a settle.
  if (blocked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: '14px 18px',
            background: 'var(--accent-soft)',
            borderLeft: '3px solid var(--blocked)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-hero)', fontSize: 18, fontWeight: 700, color: 'var(--blocked)', letterSpacing: '0.01em' }}>
            Refused — funds held in escrow
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.6, color: 'var(--text-2)' }}>
            The compliance gate rejected the trade. No value left the escrow
            contract; nothing was paid to the supplier.
          </span>
        </div>

        {/* The same real wallets — but the release step is refused on-chain */}
        <WalletFlow amount={amount ?? ''} released={false} />
      </div>
    )
  }

  // CLEAR but settlement not yet revealed (cleared, awaiting tx).
  if (!fundsThrough || !tx) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '16px 18px',
          background: 'var(--bg-sunken)',
          borderLeft: '3px solid var(--border-strong)',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: phase === 'cleared' ? 'var(--cleared)' : 'var(--text-3)', animation: phase === 'cleared' ? 'fs-pulse 1.3s ease-in-out infinite' : 'none' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', color: 'var(--text-3)' }}>
          {phase === 'cleared' ? 'Releasing on the stablecoin rail…' : 'Awaiting settlement'}
        </span>
      </div>
    )
  }

  // SETTLED → the real, clickable on-chain money flow.
  const txUrl = tx.explorerUrl || (tx.hash ? `${EXPLORER}/tx/${tx.hash}` : null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Settled-in headline */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          padding: '14px 18px',
          background: 'rgba(21,128,61,0.07)',
          borderLeft: '3px solid var(--cleared)',
        }}
      >
        <span style={{ fontFamily: 'var(--font-hero)', fontSize: 20, fontWeight: 700, color: 'var(--cleared)', letterSpacing: '0.01em' }}>
          Settled{settleSecs != null ? ` in ${settleSecs}s` : ''}
        </span>
        {amount && (
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>
            {amount}
          </span>
        )}
      </div>

      {/* Live on-chain finality — the optimistic tx mining into a block. */}
      {tx.chain === 'sepolia' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: -8 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: confirmedBlock != null ? 'var(--cleared)' : 'var(--accent)',
              animation: confirmedBlock == null ? 'fs-pulse 1.3s ease-in-out infinite' : 'none',
            }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.03em', color: confirmedBlock != null ? 'var(--cleared)' : 'var(--text-3)' }}>
            {confirmedBlock != null ? `Confirmed on-chain · block ${confirmedBlock}` : 'Confirming on Sepolia…'}
          </span>
        </div>
      )}

      {/* The real value flow across live Sepolia wallets */}
      <WalletFlow amount={amount ?? ''} released />

      {/* Transaction + the stablecoin asset, clickable */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderTop: '1px solid var(--border)' }}>
        <ChainRow
          label="Settlement transaction"
          value={truncHash(tx.hash)}
          title={tx.hash}
          href={txUrl}
          chain={tx.chain}
          hint="the permanent, public on-chain record"
          mono
        />
        {USDC && (
          <ChainRow
            label="Stablecoin (the money)"
            value={`MockUSDC · ${truncAddr(USDC)}`}
            title={USDC}
            href={`${EXPLORER}/address/${USDC}`}
            hint="digital test-dollars — the asset that actually moved"
            mono
          />
        )}
      </div>
    </div>
  )
}

// ─── The real on-chain actors + the value moving between them ───────────────
// Every address is a live Sepolia account/contract; the step labels mirror the
// escrow's actual function calls. Shown on settle (released) and on a block
// (released=false → the release step is refused and the supplier stays unpaid).
function WalletFlow({ amount, released }: { amount: string; released: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Plain-language legend so a non-crypto viewer knows what these are. */}
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, lineHeight: 1.5, color: 'var(--text-3)', marginBottom: 12 }}>
        Real accounts &amp; contracts on the Sepolia test blockchain — click any to verify on Etherscan.
      </span>
      <WalletNode
        tone="var(--accent)"
        kind="Wallet"
        role="Buyer"
        addr={BUYER}
        hint="The importer's on-chain account — funds the payment"
        arriveDelay={0}
      />
      <FlowStep action={`deposits${amount ? ` ${amount}` : ''} into escrow`} state="done" delay={0.2} />
      <WalletNode
        tone="var(--text-1)"
        kind="Smart contract"
        role="TradeEscrow"
        addr={ESCROW}
        hint="Code that holds the money and releases it only if the AI clears the trade"
        square
        arriveDelay={0.7}
      />
      <FlowStep
        action={released ? 'approveAndRelease() — AI-cleared' : 'reject() — AI-blocked'}
        state={released ? 'done' : 'refused'}
        delay={0.95}
      />
      <WalletNode
        tone={released ? 'var(--cleared)' : 'var(--text-3)'}
        kind="Wallet"
        role={released ? 'Supplier — paid' : 'Supplier — not paid'}
        addr={SUPPLIER}
        hint={released ? "The exporter's on-chain account — received the money" : 'No money released — held in the escrow contract'}
        dim={!released}
        arriveDelay={released ? 1.5 : undefined}
      />
    </div>
  )
}

// One on-chain actor: node dot + role + a prominent address chip + Etherscan ↗.
function WalletNode({
  tone,
  role,
  kind,
  addr,
  hint,
  square,
  dim,
  arriveDelay,
}: {
  tone: string
  role: string
  kind?: string
  addr: string
  hint: string
  square?: boolean
  dim?: boolean
  arriveDelay?: number
}) {
  const href = addr ? `${EXPLORER}/address/${addr}` : null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, opacity: dim ? 0.5 : 1 }}>
      <span
        style={{
          width: 11,
          height: 11,
          marginTop: 3,
          borderRadius: square ? 2 : '50%',
          background: tone,
          flexShrink: 0,
          boxShadow: '0 0 0 4px rgba(0,0,0,0.03)',
          animation: arriveDelay != null ? `fs-arrive 0.5s ease-out ${arriveDelay}s both` : undefined,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)' }}>
            {role}
          </span>
          {kind && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px' }}>
              {kind}
            </span>
          )}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <span
            title={addr}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-1)',
              letterSpacing: '0.02em',
              background: 'var(--bg-sunken)',
              padding: '2px 7px',
              borderRadius: 3,
            }}
          >
            {addr ? truncAddrLong(addr) : '—'}
          </span>
          {href && (
            <a
              className="fs-chain-link"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <span className="fs-chain-link-text">Etherscan</span>
              <span aria-hidden="true">↗</span>
            </a>
          )}
        </span>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: 'var(--text-3)' }}>{hint}</span>
      </div>
    </div>
  )
}

// The connector between two wallet nodes: the line draws downward and (on a
// release) a glowing token rides it, so the value is seen to move. `delay`
// sequences the two steps so deposit then release play in order.
function FlowStep({ action, state, delay = 0 }: { action: string; state: 'done' | 'refused'; delay?: number }) {
  const color = state === 'refused' ? 'var(--blocked)' : 'var(--cleared)'
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 11, height: 34 }}>
      <span style={{ width: 11, position: 'relative', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        {/* faint base rail */}
        <span style={{ position: 'absolute', top: 0, bottom: 0, width: 1.5, background: 'var(--border)' }} />
        {/* the value drawing down the rail */}
        <span style={{ position: 'absolute', top: 0, bottom: 0, width: 1.5, background: color, opacity: 0.85, transformOrigin: 'top center', animation: `fs-flow-fill 0.55s ease-out ${delay}s both` }} />
        {/* the glowing token that moves (only when value actually moves) */}
        {state === 'done' && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 7px ${color}`,
              animation: `fs-flow-travel 0.7s ease-out ${delay}s both`,
            }}
          />
        )}
      </span>
      <span style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 10.5, color, letterSpacing: '0.02em', animation: `fs-fade-in 0.4s ease-out ${delay + 0.15}s both` }}>
        <span aria-hidden="true">{state === 'refused' ? '✕' : '↓'}</span>
        <span>{action}</span>
      </span>
    </div>
  )
}

// One clickable Etherscan row — value + ↗ link, hover underline.
function ChainRow({
  label,
  value,
  title,
  href,
  hint,
  chain,
  mono,
}: {
  label: string
  value: string
  title?: string
  href: string | null
  hint?: string
  chain?: string
  mono?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '11px 2px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8.5,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
          }}
        >
          {label}
          {chain ? ` · ${chain}` : ''}
        </span>
        <span
          title={title}
          style={{
            fontFamily: mono ? 'var(--font-mono)' : 'var(--font-ui)',
            fontSize: 12.5,
            color: 'var(--text-1)',
            letterSpacing: '0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {value}
        </span>
        {hint && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.04em', color: 'var(--text-3)' }}>
            {hint}
          </span>
        )}
      </div>
      {href && (
        <a
          className="fs-chain-link"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginLeft: 'auto',
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <span className="fs-chain-link-text">Etherscan</span>
          <span aria-hidden="true">↗</span>
        </a>
      )}
    </div>
  )
}

// ─── Reconciliation — ONE compact line ─────────────────────────────────────
function ReconLine({ settled, blocked }: { settled: boolean; blocked: boolean }) {
  const color = settled ? 'var(--cleared)' : blocked ? 'var(--blocked)' : 'var(--text-3)'
  const breaks = blocked ? 'held in escrow' : '0 breaks'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '13px 16px',
        background: settled ? 'rgba(21,128,61,0.06)' : 'var(--bg-sunken)',
        borderLeft: `3px solid ${settled ? 'var(--cleared)' : blocked ? 'var(--blocked)' : 'var(--border-strong)'}`,
        transition: 'background 0.4s ease',
      }}
    >
      <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, lineHeight: 1, flexShrink: 0 }}>
        {settled ? '✓' : '·'}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.5, color: 'var(--text-2)', letterSpacing: '0.02em' }}>
        <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>Buyer · Supplier · Regulator</span>
        {' — reconciled off one settlement event · '}
        <span style={{ color, fontWeight: 600 }}>{breaks}</span>
      </span>
    </div>
  )
}

// ─── The phase rail (the flow diagram across the top) ──────────────────────
type PStatus = 'pending' | 'active' | 'done' | 'refused'
const PHASE_LABELS = ['Trade', 'AI gate', 'Escrow', 'Release', 'Settled']

function PhaseRail({ statuses }: { statuses: PStatus[] }) {
  const last = PHASE_LABELS.length - 1
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
      {PHASE_LABELS.map((label, i) => {
        const s = statuses[i] ?? 'pending'
        const color =
          s === 'refused' ? 'var(--blocked)'
          : s === 'done' ? 'var(--cleared)'
          : s === 'active' ? 'var(--accent)'
          : 'var(--text-3)'
        const filled = s === 'done' || s === 'refused'
        const passed = filled // outgoing connector lights once this node is resolved
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'flex-start', flex: i < last ? 1 : '0 0 auto', minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, flexShrink: 0, width: 62 }}>
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: filled ? '#fff' : color,
                  background: filled ? color : 'var(--bg-surface)',
                  border: `1.5px solid ${color}`,
                  boxShadow: s === 'active' ? '0 0 0 4px rgba(193,18,31,0.12)' : 'none',
                  animation: s === 'active' ? 'fs-pulse 1.5s ease-in-out infinite' : 'none',
                  transition: 'background 0.3s ease, color 0.3s ease, border-color 0.3s ease',
                }}
              >
                {s === 'done' ? '✓' : s === 'refused' ? '✕' : i + 1}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: s === 'pending' ? 'var(--text-3)' : color, textAlign: 'center', whiteSpace: 'nowrap', transition: 'color 0.3s ease' }}>
                {label}
              </span>
            </div>
            {i < last && (
              <div style={{ flex: 1, height: 1.5, marginTop: 12.5, minWidth: 14, background: passed ? color : 'var(--border)', transition: 'background 0.4s ease' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── The defined end state: payment complete, with the full receipt ─────────
function PaymentComplete({
  amount,
  tx,
  settleSecs,
  confirmedBlock,
}: {
  amount: string | null
  tx: TxInfo | null
  settleSecs: number | null
  confirmedBlock: number | null
}) {
  const txUrl = tx?.explorerUrl || (tx?.hash ? `${EXPLORER}/tx/${tx.hash}` : null)
  return (
    <div
      style={{
        animation: 'fs-rise 0.5s cubic-bezier(0.2,0.8,0.2,1) both',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        padding: '22px 24px',
        background: 'rgba(21,128,61,0.06)',
        borderTop: '1px solid var(--cleared)',
        borderRight: '1px solid var(--cleared)',
        borderBottom: '1px solid var(--cleared)',
        borderLeft: '3px solid var(--cleared)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'var(--cleared)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 700,
            flexShrink: 0,
            animation: 'fs-arrive 0.6s ease-out 0.15s both',
          }}
        >
          ✓
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-hero)', fontSize: 22, fontWeight: 700, color: 'var(--cleared)', letterSpacing: '0.01em' }}>Payment complete</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)' }}>
            Settled{settleSecs != null ? ` in ${settleSecs}s` : ''} on the stablecoin rail{amount ? ` · ${amount}` : ''}
          </span>
        </div>
      </div>

      {/* the real value flow, animated through the wallets */}
      <WalletFlow amount={amount ?? ''} released />

      {/* the receipt */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderTop: '1px solid var(--border)' }}>
        <ChainRow label="Settlement transaction" value={truncHash(tx?.hash ?? '')} title={tx?.hash} href={txUrl} chain={tx?.chain} hint="the permanent, public on-chain record" mono />
        {confirmedBlock != null && (
          <ChainRow label="Confirmed block" value={`#${confirmedBlock}`} href={null} hint="mined & final on Sepolia" mono />
        )}
        {USDC && (
          <ChainRow label="Stablecoin (the money)" value={`MockUSDC · ${truncAddr(USDC)}`} title={USDC} href={`${EXPLORER}/address/${USDC}`} hint="digital test-dollars — the asset that moved" mono />
        )}
      </div>

      {/* reconciliation — one event, three ledgers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'rgba(21,128,61,0.09)' }}>
        <span style={{ color: 'var(--cleared)', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>✓</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>
          Buyer · Supplier · Regulator — reconciled off one settlement event · 0 breaks
        </span>
      </div>
    </div>
  )
}

function Styles() {
  return (
    <style>{`
      @keyframes fs-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%      { opacity: 0.55; transform: scale(1.35); }
      }
      @keyframes fs-blink {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0; }
      }
      /* Money-flow: the connector line draws downward as the value moves. */
      @keyframes fs-flow-fill {
        from { transform: scaleY(0); }
        to   { transform: scaleY(1); }
      }
      /* A glowing token rides the connector from one wallet to the next. */
      @keyframes fs-flow-travel {
        0%   { transform: translateY(0);    opacity: 0; }
        20%  { opacity: 1; }
        80%  { opacity: 1; }
        100% { transform: translateY(27px); opacity: 0; }
      }
      /* A wallet node pops when the value arrives. */
      @keyframes fs-arrive {
        0%, 100% { transform: scale(1); }
        45%      { transform: scale(1.5); }
      }
      @keyframes fs-fade-in {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes fs-rise {
        from { opacity: 0; transform: translateY(16px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .fs-chain-link:hover { color: #a50f1a; }
      .fs-chain-link:hover .fs-chain-link-text { text-decoration: underline; }
    `}</style>
  )
}
