'use client'

import { useEffect, useRef } from 'react'

/* GlobeBackground — animated diagonal sine-line field behind the hero.
   Ported from the Meridian LandingBackground, re-themed LIGHT:
   off-white fill (#fafafa) with faint grey diagonal lines. Same motion.
   Fixed, full-viewport, pointer-events:none, sits behind all content. */

const SPACING  = 8
const DIAGONAL = 0.50
const SPEED    = 0.09

const A1 = 130, F1 = 0.0088, PS1 = 0.054
const A2 = 32,  F2 = 0.0037, PS2 = 0.090

function lineY(x: number, i: number, t: number): number {
  return (
    A1 * Math.sin(F1 * x + PS1 * i + t) +
    A2 * Math.sin(F2 * x + PS2 * i + t * 1.6)
  )
}

export default function GlobeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = (timestamp: number) => {
      const t = timestamp * 0.001 * SPEED
      const W = canvas.width
      const H = canvas.height

      // Light off-white base
      ctx.fillStyle = '#fafafa'
      ctx.fillRect(0, 0, W, H)

      const maxDisplace  = A1 + A2
      const diagonalSpan = W * DIAGONAL
      const totalHeight  = H + diagonalSpan + maxDisplace * 2
      const lineCount    = Math.ceil(totalHeight / SPACING) + 4
      const startY       = -maxDisplace - diagonalSpan * 0.5

      // Faint grey diagonal lines
      ctx.strokeStyle = 'rgba(0,0,0,0.055)'
      ctx.lineWidth   = 1.0

      const step = 3

      for (let i = 0; i < lineCount; i++) {
        const baseY = startY + i * SPACING

        ctx.beginPath()
        for (let x = 0; x <= W; x += step) {
          const y = baseY + x * DIAGONAL + lineY(x, i, t)
          if (x === 0) ctx.moveTo(x, y)
          else         ctx.lineTo(x, y)
        }
        ctx.stroke()
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
