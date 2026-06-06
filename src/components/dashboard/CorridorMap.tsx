'use client'

// Harbour — CorridorMap
// Light-themed visual of the trade lane: origin → HK hub → destination, using
// CORRIDORS[corridor]. Deliberately a RELIABLE pure-SVG arc map (no R3F globe):
// lat/lon waypoints projected into the viewBox, three labelled nodes, an arc
// that animates origin → hub → destination, mono coordinate labels, red accent.
// Light theme; documented var(--…) tokens.

import { useMemo } from 'react'
import { CORRIDORS } from '@/lib/fixtures'
import type { Corridor } from '@/lib/types'

interface CorridorMapProps {
  corridor: Corridor
}

const VIEW_W = 720
const VIEW_H = 320
const PAD = 56

interface Pt {
  x: number
  y: number
}

// Equirectangular projection of lon/lat into the viewBox, padded so labels fit.
function project(
  lon: number,
  lat: number,
  bounds: { minLon: number; maxLon: number; minLat: number; maxLat: number }
): Pt {
  const { minLon, maxLon, minLat, maxLat } = bounds
  const lonSpan = maxLon - minLon || 1
  const latSpan = maxLat - minLat || 1
  const x = PAD + ((lon - minLon) / lonSpan) * (VIEW_W - 2 * PAD)
  // lat increases upward, SVG y increases downward → invert.
  const y = PAD + (1 - (lat - minLat) / latSpan) * (VIEW_H - 2 * PAD)
  return { x, y }
}

// Quadratic arc between two points, bowed perpendicular to the segment so the
// lane reads as a flight/shipping arc rather than a straight line.
function arcPath(a: Pt, b: Pt, bow = 0.22): { d: string; ctrl: Pt } {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  // Perpendicular normal, bowed "up" (toward smaller y) for a clean look.
  let nx = -dy / len
  let ny = dx / len
  if (ny > 0) {
    nx = -nx
    ny = -ny
  }
  const ctrl: Pt = { x: mx + nx * len * bow, y: my + ny * len * bow }
  return { d: `M ${a.x} ${a.y} Q ${ctrl.x} ${ctrl.y} ${b.x} ${b.y}`, ctrl }
}

export default function CorridorMap({ corridor }: CorridorMapProps) {
  const lane = CORRIDORS[corridor]

  const { nodes, originHub, hubDest, originPt, hubPt, destPt, hubIsOrigin } =
    useMemo(() => {
      const pts = [lane.origin, lane.hub, lane.destination]
      const lons = pts.map((p) => p.lon)
      const lats = pts.map((p) => p.lat)
      const bounds = {
        minLon: Math.min(...lons),
        maxLon: Math.max(...lons),
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
      }
      const o = project(lane.origin.lon, lane.origin.lat, bounds)
      const h = project(lane.hub.lon, lane.hub.lat, bounds)
      const d = project(lane.destination.lon, lane.destination.lat, bounds)

      // Some corridors (EU_HK) share origin === hub; skip the degenerate arc.
      const sameOH =
        Math.abs(lane.origin.lon - lane.hub.lon) < 0.01 &&
        Math.abs(lane.origin.lat - lane.hub.lat) < 0.01

      return {
        nodes: [
          { ...lane.origin, pt: o, role: 'ORIGIN' as const },
          { ...lane.hub, pt: h, role: 'HUB' as const },
          { ...lane.destination, pt: d, role: 'DEST' as const },
        ],
        originHub: arcPath(o, h),
        hubDest: arcPath(h, d),
        originPt: o,
        hubPt: h,
        destPt: d,
        hubIsOrigin: sameOH,
      }
    }, [lane])

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--panel-radius)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          fontFamily: 'var(--font-ui)',
          fontSize: 9,
          fontWeight: 600,
          color: 'var(--text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--accent)',
            flexShrink: 0,
          }}
        />
        <span>Corridor</span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.06em',
            color: 'var(--text-2)',
          }}
        >
          {lane.label}
        </span>
      </div>

      {/* Map */}
      <div style={{ flex: 1, minHeight: 0, padding: 12 }}>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          width="100%"
          height="100%"
          style={{ display: 'block' }}
          role="img"
          aria-label={`Trade corridor ${lane.label}`}
        >
          <defs>
            <linearGradient id="harbour-arc" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
              <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.25" />
            </linearGradient>
          </defs>

          {/* Faint lat/lon grid for an atlas feel */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={`h-${f}`}
              x1={0}
              y1={VIEW_H * f}
              x2={VIEW_W}
              y2={VIEW_H * f}
              stroke="var(--border)"
              strokeWidth={1}
            />
          ))}
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={`v-${f}`}
              x1={VIEW_W * f}
              y1={0}
              x2={VIEW_W * f}
              y2={VIEW_H}
              stroke="var(--border)"
              strokeWidth={1}
            />
          ))}

          {/* Base arcs (static, faint) */}
          {!hubIsOrigin && (
            <path d={originHub.d} fill="none" stroke="var(--border-strong)" strokeWidth={1.5} />
          )}
          <path d={hubDest.d} fill="none" stroke="var(--border-strong)" strokeWidth={1.5} />

          {/* Animated flow arcs (origin→hub→dest) */}
          {!hubIsOrigin && (
            <path
              d={originHub.d}
              fill="none"
              stroke="url(#harbour-arc)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray="10 14"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="48"
                to="0"
                dur="1.6s"
                repeatCount="indefinite"
              />
            </path>
          )}
          <path
            d={hubDest.d}
            fill="none"
            stroke="url(#harbour-arc)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="10 14"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="48"
              to="0"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </path>

          {/* Travelling pulse along the full lane */}
          {!hubIsOrigin && (
            <circle r={3.5} fill="var(--accent)">
              <animateMotion dur="1.6s" repeatCount="indefinite" path={originHub.d} />
            </circle>
          )}
          <circle r={3.5} fill="var(--accent)">
            <animateMotion
              dur="1.8s"
              repeatCount="indefinite"
              path={hubDest.d}
              begin={hubIsOrigin ? '0s' : '1.6s'}
            />
          </circle>

          {/* Nodes */}
          {nodes.map((n, i) => {
            // Skip the duplicate origin marker when origin === hub.
            if (hubIsOrigin && n.role === 'ORIGIN') return null
            const isHub = n.role === 'HUB'
            const labelAbove = n.pt.y > VIEW_H * 0.5
            return (
              <g key={`${n.code}-${i}`}>
                {/* halo */}
                <circle cx={n.pt.x} cy={n.pt.y} r={isHub ? 11 : 8} fill="var(--accent-soft)">
                  <animate
                    attributeName="r"
                    values={isHub ? '9;13;9' : '6;9;6'}
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                </circle>
                {/* core dot */}
                <circle
                  cx={n.pt.x}
                  cy={n.pt.y}
                  r={isHub ? 5 : 4}
                  fill={isHub ? 'var(--accent)' : 'var(--bg-surface)'}
                  stroke="var(--accent)"
                  strokeWidth={2}
                />
                {/* labels */}
                <text
                  x={n.pt.x}
                  y={labelAbove ? n.pt.y - 16 : n.pt.y + 22}
                  textAnchor="middle"
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 13,
                    fontWeight: 600,
                    fill: 'var(--text-1)',
                  }}
                >
                  {n.name}
                </text>
                <text
                  x={n.pt.x}
                  y={labelAbove ? n.pt.y - 16 + 13 : n.pt.y + 22 + 13}
                  textAnchor="middle"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    fill: 'var(--text-3)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {n.code} · {fmtCoord(n.lat, n.lon)}
                </text>
                {/* role tag */}
                <text
                  x={n.pt.x}
                  y={labelAbove ? n.pt.y - 16 - 11 : n.pt.y + 22 + 24}
                  textAnchor="middle"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    fill: isHub ? 'var(--accent)' : 'var(--text-3)',
                  }}
                >
                  {n.role === 'DEST' ? 'DESTINATION' : n.role}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Footer coordinate strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          borderTop: '1px solid var(--border)',
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-3)',
          letterSpacing: '0.06em',
          flexShrink: 0,
        }}
      >
        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>LANE</span>
        <span>
          {lane.origin.code} → {lane.hub.code} → {lane.destination.code}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>
          via HK settlement hub
        </span>
      </div>
    </div>
  )
}

// Compact DMS-ish coordinate label, e.g. "22.48°N 113.91°E".
function fmtCoord(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(2)}°${ns} ${Math.abs(lon).toFixed(2)}°${ew}`
}
