'use client'

// Harbour — VerdictStream (the centerpiece)
// When `scenarioId` becomes non-null it POSTs /api/verify {scenarioId} and
// consumes the SSE VerifyEvent stream (reader loop mirrors ResponseStream):
//   fetch POST → res.body.getReader() → TextDecoder → split('\n') → parse `data:` lines.
//
// VerifyEvent shapes (frozen, see lib/types.ts):
//   { type:'text';    text }                                   → append reasoning token
//   { type:'verdict'; result }                                 → CLEARED / BLOCKED badge + checks + flags
//   { type:'tx';      hash, status, chain, explorerUrl }       → settlement tx hash + explorer link
//   { type:'error';   message }                                → soft error
//   { type:'done' }                                            → stream complete
//
// Callbacks bubble structured state up to page.tsx:
//   onStatus('VERIFYING')           when streaming starts
//   onResult(result)                on verdict
//   onTx({hash,status,chain,explorerUrl}) + onStatus('SETTLED'|'BLOCKED') on tx
// Light theme; uses the documented var(--…) tokens.

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import type {
  VerifyEvent,
  ProofOfTradeResult,
  PassportStatus,
  CrossDocCheck,
} from '@/lib/types'

interface TxInfo {
  hash: string
  status: PassportStatus
  chain: string
  explorerUrl: string | null
}

interface VerdictStreamProps {
  scenarioId: string | null
  onResult?: (r: ProofOfTradeResult) => void
  onTx?: (tx: TxInfo) => void
  onStatus?: (s: PassportStatus | 'IDLE') => void
}

function truncHash(hash: string): string {
  if (hash.length <= 18) return hash
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`
}

export default function VerdictStream({
  scenarioId,
  onResult,
  onTx,
  onStatus,
}: VerdictStreamProps) {
  const t = useTranslations('verdictStream')
  const [text, setText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [result, setResult] = useState<ProofOfTradeResult | null>(null)
  const [tx, setTx] = useState<TxInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const bodyRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  // Track the scenario we last kicked off so a re-run of the same id restarts.
  const startedForRef = useRef<string | null>(null)

  // Auto-scroll the reasoning body as tokens arrive.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [text, result, tx])

  useEffect(() => {
    // Cleared → reset to the calm idle state.
    if (!scenarioId) {
      abortRef.current?.abort()
      startedForRef.current = null
      setText('')
      setStreaming(false)
      setResult(null)
      setTx(null)
      setError(null)
      return
    }
    // New (or re-triggered) scenario → start a fresh verification.
    if (startedForRef.current === scenarioId) return
    startedForRef.current = scenarioId
    void runVerify(scenarioId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId])

  const runVerify = async (id: string) => {
    // Reset visible state for the new run.
    setText('')
    setResult(null)
    setTx(null)
    setError(null)
    setStreaming(true)
    onStatus?.('VERIFYING')

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: id }),
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
      // Soft error — the stream/route is unavailable. Keep the demo calm and
      // still notify the parent so it can settle its own state machine.
      setError(
        t('streamError')
      )
      onStatus?.('IDLE')
    } finally {
      setStreaming(false)
    }
  }

  const handleEvent = (evt: VerifyEvent) => {
    switch (evt.type) {
      case 'text':
        if (evt.text) setText((prev) => prev + evt.text)
        break
      case 'verdict':
        setResult(evt.result)
        onResult?.(evt.result)
        break
      case 'tx': {
        const next: TxInfo = {
          hash: evt.hash,
          status: evt.status,
          chain: evt.chain,
          explorerUrl: evt.explorerUrl,
        }
        setTx(next)
        onTx?.(next)
        onStatus?.(evt.status) // 'SETTLED' | 'BLOCKED' (or whatever the chain reports)
        break
      }
      case 'error':
        setError(evt.message || 'Verification error')
        onStatus?.('IDLE')
        break
      case 'done':
        break
    }
  }

  const idle = !scenarioId && !streaming && !result && !text && !error
  const cleared = result?.verdict === 'CLEAR'

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
            background: streaming
              ? 'var(--accent)'
              : result
                ? cleared
                  ? 'var(--cleared)'
                  : 'var(--blocked)'
                : 'var(--text-3)',
            animation: streaming ? 'pulse-dot 1.4s ease-in-out infinite' : 'none',
            flexShrink: 0,
          }}
        />
        <span>{t('title')}</span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.06em',
            color: streaming ? 'var(--accent)' : 'var(--text-3)',
          }}
        >
          {streaming
            ? t('verifying').toUpperCase()
            : result
              ? cleared
                ? t('cleared').toUpperCase()
                : t('blocked').toUpperCase()
              : t('standby').toUpperCase()}
        </span>
      </div>

      {/* Body */}
      <div
        ref={bodyRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {/* Idle placeholder */}
        {idle && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 10,
              color: 'var(--text-3)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: 22, opacity: 0.5 }}>⊘</span>
            {t('selectTrade')}
          </div>
        )}

        {/* Streamed reasoning */}
        {(streaming || text) && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              lineHeight: 1.7,
              color: 'var(--text-2)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {text}
            {streaming && (
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 13,
                  marginLeft: 2,
                  background: 'var(--accent)',
                  verticalAlign: 'text-bottom',
                  animation: 'blink 0.8s step-end infinite',
                }}
              />
            )}
          </div>
        )}

        {/* Soft error */}
        {error && (
          <div
            style={{
              padding: '10px 12px',
              background: 'var(--accent-soft)',
              borderTop: '1px solid var(--border-strong)',
              borderRight: '1px solid var(--border-strong)',
              borderBottom: '1px solid var(--border-strong)',
              borderLeft: '2px solid var(--accent)',
              borderRadius: 'var(--panel-radius)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-2)',
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* Verdict block */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <VerdictBadge result={result} />
            <ChecksList checks={result.checks} />
            {result.flags.length > 0 && <FlagsList flags={result.flags} />}
          </div>
        )}

        {/* Settlement tx */}
        {tx && <TxBlock tx={tx} />}
      </div>
    </div>
  )
}

// ─── Verdict badge ────────────────────────────────────────────────────────
function VerdictBadge({ result }: { result: ProofOfTradeResult }) {
  const cleared = result.verdict === 'CLEAR'
  const color = cleared ? 'var(--cleared)' : 'var(--blocked)'
  const soft = cleared ? 'rgba(21,128,61,0.08)' : 'var(--accent-soft)'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        background: soft,
        border: `1px solid ${color}`,
        borderRadius: 'var(--panel-radius)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontFamily: 'var(--font-hero)',
            fontSize: 30,
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: '0.04em',
            color,
          }}
        >
          {cleared ? 'CLEARED' : 'BLOCKED'}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-2)',
            letterSpacing: '0.06em',
          }}
        >
          {cleared ? 'Proof of trade verified' : 'Settlement refused — held in escrow'}
        </span>
      </div>
      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-3)',
          }}
        >
          Risk
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 26,
            fontWeight: 600,
            lineHeight: 1,
            color,
          }}
        >
          {result.riskScore}
        </span>
      </div>
    </div>
  )
}

// ─── Cross-document checks ────────────────────────────────────────────────
function ChecksList({ checks }: { checks: CrossDocCheck[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <SectionLabel><TranslatedLabel k="crossDocChecks" /></SectionLabel>
      {checks.map((c, i) => {
        const pass = c.status === 'PASS'
        const color = pass ? 'var(--cleared)' : 'var(--blocked)'
        return (
          <div
            key={`${c.name}-${i}`}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '8px 10px',
              background: 'var(--bg-base)',
              borderTop: '1px solid var(--border)',
              borderRight: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
              borderLeft: `2px solid ${color}`,
              borderRadius: 'var(--panel-radius)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1.3,
                color,
                flexShrink: 0,
              }}
            >
              {pass ? '✓' : '✗'}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-1)',
                }}
              >
                {c.name}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--text-2)',
                  lineHeight: 1.4,
                }}
              >
                {c.detail}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Risk flags ───────────────────────────────────────────────────────────
function FlagsList({ flags }: { flags: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <SectionLabel><TranslatedLabel k="riskFlags" /></SectionLabel>
      {flags.map((f, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '7px 10px',
            background: 'var(--accent-soft)',
            borderTop: '1px solid var(--border)',
            borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            borderLeft: '2px solid var(--blocked)',
            borderRadius: 'var(--panel-radius)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-1)',
            lineHeight: 1.4,
          }}
        >
          <span style={{ color: 'var(--blocked)', flexShrink: 0 }}>▲</span>
          {f}
        </div>
      ))}
    </div>
  )
}

// ─── Settlement tx ────────────────────────────────────────────────────────
function TxBlock({ tx }: { tx: TxInfo }) {
  const settled = tx.status === 'SETTLED'
  const color = settled ? 'var(--cleared)' : 'var(--blocked)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <SectionLabel><TranslatedLabel k="onChainSettlement" /></SectionLabel>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 12px',
          background: 'var(--bg-sunken)',
          borderTop: '1px solid var(--border)',
          borderRight: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          borderLeft: `2px solid ${color}`,
          borderRadius: 'var(--panel-radius)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-3)',
            }}
          >
            {tx.status} · {tx.chain}
          </span>
          <span
            title={tx.hash}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--text-1)',
              letterSpacing: '0.02em',
            }}
          >
            {truncHash(tx.hash)}
          </span>
        </div>
        {tx.explorerUrl && (
          <a
            href={tx.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              textDecoration: 'none',
              borderBottom: '1px solid var(--accent)',
              whiteSpace: 'nowrap',
            }}
          >
            <TranslatedLabel k="viewOnEtherscan" />
          </a>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        color: 'var(--text-3)',
      }}
    >
      {children}
    </span>
  )
}

function TranslatedLabel({ k }: { k: 'crossDocChecks' | 'riskFlags' | 'onChainSettlement' | 'viewOnEtherscan' }) {
  const t = useTranslations('verdictStream')
  return <>{t(k)}</>
}
