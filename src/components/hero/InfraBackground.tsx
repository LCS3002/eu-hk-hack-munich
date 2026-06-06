'use client'

import { useEffect, useRef } from 'react'

/* FaanSail hero backdrop — institutional payment-infrastructure motif.
   A quiet settlement-rail field: a faint background grid with thin horizontal
   "value-flow" lines, and small pulses that travel left→right along each rail
   (capital clearing). Everything is low-contrast grey on near-white so the
   near-black wordmark and the sparing HSBC-red accent stay dominant.
   No globe, no ship, no map — pure abstract infra. */

// ─── Tunables ───────────────────────────────────────────────────────────
const RAIL_GAP     = 96     // vertical px between settlement rails
const GRID_GAP     = 96     // px between faint vertical grid lines
const RAIL_RGBA    = 'rgba(0,0,0,0.05)'   // the static rail line
const GRID_RGBA    = 'rgba(0,0,0,0.035)'  // faint vertical grid
const PULSE_HEAD   = 'rgba(0,0,0,0.12)'   // leading edge of a moving pulse
const PULSE_TAIL   = 'rgba(0,0,0,0)'      // pulse trail fades to nothing
const PULSE_LEN    = 130    // px length of each pulse comet
const PULSE_SPEED  = 46     // px/sec a pulse travels along its rail

interface Pulse {
  row: number     // which rail (index)
  x: number       // current head x position, px
  speed: number   // px/sec for this pulse
}

export default function InfraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const pulsesRef = useRef<Pulse[]>([])
  const lastRef   = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = 0
    let H = 0
    let rows = 0

    const seedPulses = () => {
      rows = Math.ceil(H / RAIL_GAP) + 1
      const pulses: Pulse[] = []
      // a sparse set of pulses — only some rails are "active" at any moment
      for (let r = 0; r < rows; r++) {
        // ~55% of rails carry a pulse, staggered across the width
        if (Math.random() > 0.45) {
          pulses.push({
            row: r,
            x: Math.random() * W,
            speed: PULSE_SPEED * (0.65 + Math.random() * 0.7),
          })
        }
      }
      pulsesRef.current = pulses
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth
      H = window.innerHeight
      canvas.width  = Math.floor(W * dpr)
      canvas.height = Math.floor(H * dpr)
      canvas.style.width  = W + 'px'
      canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seedPulses()
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = (ts: number) => {
      const dt = lastRef.current ? Math.min((ts - lastRef.current) / 1000, 0.05) : 0
      lastRef.current = ts

      // near-white base
      ctx.fillStyle = '#fafafa'
      ctx.fillRect(0, 0, W, H)

      // faint vertical grid — ledger columns
      ctx.strokeStyle = GRID_RGBA
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = GRID_GAP; x < W; x += GRID_GAP) {
        ctx.moveTo(Math.round(x) + 0.5, 0)
        ctx.lineTo(Math.round(x) + 0.5, H)
      }
      ctx.stroke()

      // horizontal settlement rails
      ctx.strokeStyle = RAIL_RGBA
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let r = 0; r < rows; r++) {
        const y = Math.round(r * RAIL_GAP + RAIL_GAP * 0.5) + 0.5
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
      }
      ctx.stroke()

      // moving value-flow pulses (left → right)
      for (const p of pulsesRef.current) {
        p.x += p.speed * dt
        if (p.x - PULSE_LEN > W) {
          // recycle off the right edge back to the left, re-randomise
          p.x = -Math.random() * W * 0.6
          p.speed = PULSE_SPEED * (0.65 + Math.random() * 0.7)
        }
        const y = Math.round(p.row * RAIL_GAP + RAIL_GAP * 0.5) + 0.5
        const tailX = p.x - PULSE_LEN
        const grad = ctx.createLinearGradient(tailX, 0, p.x, 0)
        grad.addColorStop(0, PULSE_TAIL)
        grad.addColorStop(1, PULSE_HEAD)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(tailX, y)
        ctx.lineTo(p.x, y)
        ctx.stroke()

        // tiny settlement node at the head
        ctx.fillStyle = PULSE_HEAD
        ctx.beginPath()
        ctx.arc(p.x, y, 1.4, 0, Math.PI * 2)
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  )
}
