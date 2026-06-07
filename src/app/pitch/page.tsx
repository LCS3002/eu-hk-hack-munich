'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { AnimatePresence, motion } from 'framer-motion'

const PitchGlobe = dynamic(() => import('@/components/pitch/PitchGlobe'), { ssr: false })

const TOTAL = 6

const ease = [0.2, 0.8, 0.2, 1] as const
const slideV = {
  enter: { opacity: 0, y: 24 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}
const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.15 + i * 0.12, duration: 0.5, ease },
})

const mono = 'var(--font-mono)'
const hero = 'var(--font-hero), system-ui, sans-serif'
const ui = 'var(--font-ui)'

// Frosted backing so text on the globe slides stays legible over the voxel earth.
const framePanel: React.CSSProperties = {
  position: 'relative',
  background: 'rgba(252,252,253,0.82)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid var(--border)',
  borderRadius: 18,
  padding: '40px 52px',
  boxShadow: '0 12px 44px rgba(0,0,0,0.07)',
}

export default function PitchDeck() {
  const [i, setI] = useState(0)
  const next = useCallback(() => setI((v) => Math.min(TOTAL - 1, v + 1)), [])
  const prev = useCallback(() => setI((v) => Math.max(0, v - 1)), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Escape') window.location.href = '/'
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev])

  return (
    <main
      onClick={next}
      style={{
        position: 'relative',
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        background: 'var(--bg-base)',
        color: 'var(--text-1)',
        cursor: 'pointer',
        fontFamily: ui,
      }}
    >
      <AnimatePresence mode="wait">
        <motion.section
          key={i}
          variants={slideV}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.5, ease }}
          style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8vw' }}
        >
          {i === 0 && <SlideTitle />}
          {i === 1 && <SlideProblem />}
          {i === 2 && <SlideSolution />}
          {i === 3 && <SlideHK />}
          {i === 4 && <SlideResult />}
          {i === 5 && <SlideAsk />}
        </motion.section>
      </AnimatePresence>

      {/* progress dots + controls */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'absolute', bottom: 26, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, cursor: 'default', zIndex: 10 }}
      >
        <button onClick={prev} disabled={i === 0} style={navBtn(i === 0)}>←</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {Array.from({ length: TOTAL }).map((_, d) => (
            <span key={d} onClick={() => setI(d)} style={{ width: d === i ? 22 : 8, height: 8, borderRadius: 4, background: d === i ? 'var(--accent)' : 'var(--border-strong)', cursor: 'pointer', transition: 'all .3s ease' }} />
          ))}
        </div>
        <button onClick={next} disabled={i === TOTAL - 1} style={navBtn(i === TOTAL - 1)}>→</button>
      </div>

      {/* corner chrome */}
      <a href="/" onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 22, left: 26, zIndex: 10, fontFamily: mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', textDecoration: 'none', cursor: 'pointer' }}>← FaanSail</a>
      <span style={{ position: 'absolute', top: 22, right: 26, zIndex: 10, fontFamily: mono, fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-3)' }}>{i + 1} / {TOTAL} · business pitch</span>
    </main>
  )
}

function navBtn(disabled: boolean): React.CSSProperties {
  return {
    width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-surface)',
    color: disabled ? 'var(--text-3)' : 'var(--text-1)', fontSize: 15, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
  }
}

const eyebrow: React.CSSProperties = { fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--accent)' }

/* ── Slide 1 — Title ───────────────────────────────────────────────────── */
function SlideTitle() {
  return (
    <>
      <div style={{ position: 'absolute', left: '50%', bottom: '-32%', transform: 'translateX(-50%)', width: 'min(820px, 120%)', aspectRatio: '1/1', pointerEvents: 'none' }}>
        <PitchGlobe progress={0.5} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, var(--bg-base) 0%, rgba(250,250,250,0.7) 45%, transparent 80%)' }} />
      <div style={{ ...framePanel, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <motion.div {...stagger(0)} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" style={{ height: 64, width: 'auto' }} />
          <span style={{ fontFamily: hero, fontWeight: 700, fontSize: 'clamp(40px, 7vw, 78px)', letterSpacing: '0.02em' }}>FAANSAIL</span>
        </motion.div>
        <motion.div {...stagger(1)} style={{ ...eyebrow }}>Compliance-native stablecoin settlement</motion.div>
        <motion.p {...stagger(2)} style={{ fontFamily: ui, fontSize: 'clamp(15px, 2vw, 19px)', color: 'var(--text-2)', maxWidth: 620, lineHeight: 1.6 }}>
          The payment rail for the Hong Kong corridor — it verifies the trade, settles in seconds, and refuses the bad one before a cent moves.
        </motion.p>
      </div>
    </>
  )
}

/* ── Slide 2 — Problem ─────────────────────────────────────────────────── */
function SlideProblem() {
  const items = [
    ['Slow', 'Cross-border B2B settles in 3–5 days. ~$1M sits frozen per $10M/month of flow.'],
    ['Broken', 'Reconciliation is days of manual matching across separate systems — and it breaks.'],
    ['Blind', 'Compliance screens the parties, never the trade. Over-invoicing & fraud walk straight through.'],
  ]
  return (
    <div style={{ width: '100%', maxWidth: 900 }}>
      <motion.div {...stagger(0)} style={eyebrow}>The problem</motion.div>
      <motion.h2 {...stagger(1)} style={{ fontFamily: hero, fontSize: 'clamp(26px, 4.4vw, 46px)', fontWeight: 700, lineHeight: 1.15, margin: '14px 0 36px' }}>
        Trade clears through Hong Kong — and leaks money in three places at once.
      </motion.h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
        {items.map(([t, d], n) => (
          <motion.div key={t} {...stagger(2 + n)} style={{ padding: '20px 22px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', borderLeft: '3px solid var(--blocked)', borderRadius: 8 }}>
            <div style={{ fontFamily: hero, fontSize: 20, fontWeight: 700, color: 'var(--blocked)', marginBottom: 8 }}>{t}</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>{d}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ── Slide 3 — Solution (the master diagram) ───────────────────────────── */
function SlideSolution() {
  return (
    <div style={{ width: '100%', maxWidth: 1040, textAlign: 'center' }}>
      <motion.div {...stagger(0)} style={eyebrow}>The solution</motion.div>
      <motion.h2 {...stagger(1)} style={{ fontFamily: hero, fontSize: 'clamp(24px, 4vw, 42px)', fontWeight: 700, margin: '12px 0 28px' }}>
        Proof-of-trade-gated settlement.
      </motion.h2>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img {...stagger(2)} src="/overview.svg" alt="problem to FaanSail to result" style={{ width: '100%', maxWidth: 1000, height: 'auto' }} />
    </div>
  )
}

/* ── Slide 4 — Why Hong Kong ───────────────────────────────────────────── */
function SlideHK() {
  return (
    <>
      <div style={{ position: 'absolute', left: '50%', bottom: '-30%', transform: 'translateX(-50%)', width: 'min(780px, 115%)', aspectRatio: '1/1', pointerEvents: 'none' }}>
        <PitchGlobe progress={1} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, var(--bg-base) 0%, rgba(250,250,250,0.72) 48%, transparent 82%)' }} />
      <div style={{ ...framePanel, textAlign: 'center', maxWidth: 760, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <motion.div {...stagger(0)} style={eyebrow}>Why Hong Kong</motion.div>
        <motion.h2 {...stagger(1)} style={{ fontFamily: hero, fontSize: 'clamp(26px, 4.4vw, 46px)', fontWeight: 700, lineHeight: 1.15 }}>
          Built for the rail Hong Kong just licensed.
        </motion.h2>
        <motion.p {...stagger(2)} style={{ fontSize: 'clamp(14px, 1.8vw, 18px)', color: 'var(--text-2)', lineHeight: 1.6 }}>
          The Stablecoins Ordinance · Project Ensemble · HSBC and Standard Chartered licences. The Africa–China corridor — the hardest one — closes through Hong Kong. That&apos;s where we settle.
        </motion.p>
      </div>
    </>
  )
}

/* ── Slide 5 — Result / close ──────────────────────────────────────────── */
function SlideResult() {
  return (
    <div style={{ width: '100%', maxWidth: 900, textAlign: 'center' }}>
      <motion.div {...stagger(0)} style={eyebrow}>The result</motion.div>
      <motion.h2 {...stagger(1)} style={{ fontFamily: hero, fontSize: 'clamp(28px, 4.6vw, 50px)', fontWeight: 700, lineHeight: 1.12, margin: '14px 0 32px' }}>
        Verify the trade. Free the capital. Reconcile itself.
      </motion.h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 34 }}>
        {[
          ['✓ Good trade', 'settles in seconds · capital freed T+3 → T+0 · reconciled, 0 breaks', 'var(--cleared)'],
          ['✕ Bad trade', 'refused before a cent moves · funds held in escrow', 'var(--blocked)'],
          ['On-chain', 'verified contracts on Sepolia · a regulator re-runs the rules', 'var(--text-1)'],
        ].map(([t, d, c], n) => (
          <motion.div key={t as string} {...stagger(2 + n)} style={{ padding: '18px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, textAlign: 'left' }}>
            <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: c as string, marginBottom: 6 }}>{t}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55 }}>{d}</div>
          </motion.div>
        ))}
      </div>
      <motion.div {...stagger(5)} style={{ fontFamily: hero, fontSize: 'clamp(16px, 2.2vw, 22px)', fontWeight: 600 }}>
        FaanSail — the rail the corridor&apos;s fintechs license.
      </motion.div>
    </div>
  )
}

/* ── Slide 6 — The ask ─────────────────────────────────────────────────── */
function SlideAsk() {
  return (
    <div style={{ width: '100%', maxWidth: 760, textAlign: 'center' }}>
      <motion.div {...stagger(0)} style={eyebrow}>The ask</motion.div>
      <motion.h2 {...stagger(1)} style={{ fontFamily: hero, fontSize: 'clamp(26px, 4.4vw, 46px)', fontWeight: 700, lineHeight: 1.14, margin: '12px 0 30px' }}>
        Help us put the gate on a live trade lane.
      </motion.h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 34, textAlign: 'left' }}>
        {[
          ['A design partner', 'one corridor bank or PSP already licensed under the HK Stablecoins Ordinance.'],
          ['A pilot lane', 'a 6-week live pilot on one Africa–China lane — real stablecoin, our gate enforcing the verdict.'],
          ['A sandbox seat', 'an intro to the HKMA Project Ensemble / regulatory sandbox to settle on the licensed rail.'],
        ].map(([t, d], n) => (
          <motion.div key={t} {...stagger(2 + n)} style={{ display: 'flex', gap: 16, alignItems: 'baseline', padding: '14px 18px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 8 }}>
            <span style={{ fontFamily: hero, fontSize: 15, fontWeight: 700, color: 'var(--accent)', flex: '0 0 140px' }}>{t}</span>
            <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>{d}</span>
          </motion.div>
        ))}
      </div>
      <motion.div {...stagger(5)} style={{ fontFamily: mono, fontSize: 12, letterSpacing: '0.08em', color: 'var(--text-3)' }}>
        Live on Sepolia today · verified contracts · ready to pilot.
      </motion.div>
    </div>
  )
}
