'use client'

// FaanSail — UploadPanel
// A modal overlay for uploading real trade documents (invoice + bill of lading).
// Supports PDF, images (PNG/JPG/WEBP), and text files.
// Images are base64-encoded and sent to Claude Vision; text files are read directly.
// Matches the institutional white/red design language.

import { useCallback, useRef, useState } from 'react'
import type { UploadedDocs, UploadedDoc, DocMediaType } from '@/lib/types'

interface UploadPanelProps {
  onSubmit: (docs: UploadedDocs) => void
  onClose: () => void
}

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.txt,.csv'
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

async function readFile(file: File): Promise<UploadedDoc> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const isImage = IMAGE_TYPES.includes(file.type)

    if (isImage) {
      reader.onload = () => {
        // Strip the data URL prefix — keep only the base64 part
        const dataUrl = reader.result as string
        const base64 = dataUrl.split(',')[1] ?? dataUrl
        resolve({ content: base64, mediaType: 'image' as DocMediaType, name: file.name })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    } else {
      // PDF or text: read as text. PDFs will be partially readable but Claude
      // handles this gracefully; for real PDFs the image path is preferred.
      reader.onload = () => {
        resolve({ content: reader.result as string, mediaType: 'text' as DocMediaType, name: file.name })
      }
      reader.onerror = reject
      reader.readAsText(file)
    }
  })
}

interface DropZoneProps {
  label: string
  sub: string
  file: UploadedDoc | null
  onFile: (doc: UploadedDoc) => void
}

function DropZone({ label, sub, file, onFile }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handle = useCallback(
    async (f: File) => {
      try {
        const doc = await readFile(f)
        onFile(doc)
      } catch {
        // silently ignore — user can try again
      }
    },
    [onFile]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const f = e.dataTransfer.files[0]
      if (f) void handle(f)
    },
    [handle]
  )

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) void handle(f)
    },
    [handle]
  )

  const accent = '#c1121f'
  const border = dragging ? accent : file ? 'rgba(21,128,61,0.5)' : 'rgba(0,0,0,0.12)'
  const bg = dragging ? 'rgba(193,18,31,0.04)' : file ? 'rgba(21,128,61,0.04)' : '#fafafa'

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        flex: 1,
        minHeight: 120,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '20px 16px',
        border: `1.5px dashed ${border}`,
        background: bg,
        cursor: 'pointer',
        transition: 'border-color 0.18s ease, background 0.18s ease',
        userSelect: 'none',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        style={{ display: 'none' }}
        onChange={onInputChange}
      />
      {file ? (
        <>
          <span style={{ fontSize: 22 }}>✓</span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              color: '#15803d',
              letterSpacing: '0.04em',
              textAlign: 'center',
            }}
          >
            {file.name}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'rgba(21,128,61,0.7)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {file.mediaType === 'image' ? 'Image · Claude Vision' : 'Text · extracted'}
          </span>
        </>
      ) : (
        <>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#c1121f',
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 12,
              color: 'rgba(0,0,0,0.45)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            {sub}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8.5,
              color: 'rgba(0,0,0,0.3)',
              letterSpacing: '0.06em',
            }}
          >
            PDF · PNG · JPG · TXT
          </span>
        </>
      )}
    </div>
  )
}

export default function UploadPanel({ onSubmit, onClose }: UploadPanelProps) {
  const [invoice, setInvoice] = useState<UploadedDoc | null>(null)
  const [bol, setBol] = useState<UploadedDoc | null>(null)
  const [amount, setAmount] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [loading, setLoading] = useState(false)

  const canSubmit = invoice && bol && !loading

  const submit = useCallback(() => {
    if (!invoice || !bol) return
    setLoading(true)
    onSubmit({
      invoice,
      billOfLading: bol,
      amount: amount ? parseFloat(amount) : undefined,
      buyerName: buyerName || undefined,
      supplierName: supplierName || undefined,
    })
  }, [invoice, bol, amount, buyerName, supplierName, onSubmit])

  const inputStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: 'var(--text-1)',
    background: 'var(--bg-sunken)',
    border: '1px solid var(--border)',
    borderRadius: 0,
    padding: '7px 10px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }

  return (
    // Backdrop
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.38)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: '#fff',
          width: '100%',
          maxWidth: 560,
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
          borderTop: '3px solid #c1121f',
          animation: 'up-panel-rise 0.22s cubic-bezier(0.2,0.8,0.2,1) both',
        }}
      >
        <style>{`
          @keyframes up-panel-rise {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .up-submit { transition: background 0.15s ease, transform 0.1s ease; }
          .up-submit:hover:not(:disabled) { background: #a50f1a; transform: translateY(-1px); }
          .up-submit:disabled { opacity: 0.45; cursor: not-allowed; }
          .up-close { transition: color 0.15s ease; }
          .up-close:hover { color: #1a1a1a; }
        `}</style>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span
              style={{
                fontFamily: 'var(--font-hero)',
                fontSize: 15,
                fontWeight: 700,
                color: '#1a1a1a',
                letterSpacing: '0.01em',
              }}
            >
              Upload Trade Documents
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#c1121f',
              }}
            >
              AI Gate · Cross-document verification
            </span>
          </div>
          <button
            className="up-close"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 18,
              color: 'rgba(0,0,0,0.35)',
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Drop zones */}
        <div style={{ display: 'flex', gap: 12, padding: '20px 20px 0' }}>
          <DropZone
            label="Invoice"
            sub="Upload the commercial invoice for this shipment"
            file={invoice}
            onFile={setInvoice}
          />
          <DropZone
            label="Bill of Lading"
            sub="Upload the bill of lading for this shipment"
            file={bol}
            onFile={setBol}
          />
        </div>

        {/* Optional fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 20px 0' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8.5,
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgba(0,0,0,0.35)',
            }}
          >
            Optional — helps the AI gate
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              style={inputStyle}
              placeholder="Buyer name"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
            />
            <input
              style={inputStyle}
              placeholder="Supplier name"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />
            <input
              style={{ ...inputStyle, width: 130, flexShrink: 0 }}
              placeholder="Amount (USD)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            marginTop: 12,
            borderTop: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'rgba(0,0,0,0.35)',
              letterSpacing: '0.04em',
              lineHeight: 1.5,
              maxWidth: 260,
            }}
          >
            {invoice && bol
              ? 'Ready — Claude will cross-check the two documents and gate the settlement.'
              : 'Upload both documents to run the AI compliance gate on your trade.'}
          </span>
          <button
            className="up-submit"
            disabled={!canSubmit}
            onClick={submit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: '#c1121f',
              color: '#fff',
              border: 'none',
              borderRadius: 0,
              cursor: 'pointer',
              fontFamily: 'var(--font-hero)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {loading ? 'Running gate…' : 'Settle this trade'}
          </button>
        </div>
      </div>
    </div>
  )
}
