'use client'

import { useState, useRef } from 'react'

interface Annotation {
  id: string
  tag: string
  text: string
  description: string
  top: number
  left: number
  width: number
  height: number
}

type Mode = 'closed' | 'open' | 'selecting' | 'editing'

export function FloatingAnnotator() {
  const [mode, setMode] = useState<Mode>('closed')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [highlight, setHighlight] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const [pending, setPending] = useState<Omit<Annotation, 'id' | 'description'> | null>(null)
  const [description, setDescription] = useState('')
  const [copied, setCopied] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const getElementUnder = (x: number, y: number) => {
    if (overlayRef.current) overlayRef.current.style.pointerEvents = 'none'
    const el = document.elementFromPoint(x, y)
    if (overlayRef.current) overlayRef.current.style.pointerEvents = 'all'
    return el
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = getElementUnder(e.clientX, e.clientY)
    if (!el) return
    const rect = el.getBoundingClientRect()
    setHighlight({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    const el = getElementUnder(e.clientX, e.clientY)
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPending({
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || '').trim().slice(0, 80),
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    })
    setDescription('')
    setMode('editing')
  }

  const addAnnotation = () => {
    if (!pending || !description.trim()) return
    setAnnotations(prev => [...prev, { id: Date.now().toString(), ...pending, description }])
    setPending(null)
    setMode('open')
  }

  const generatePrompt = () => {
    const parts = annotations.map((a, i) =>
      [
        `### בקשה ${i + 1}`,
        `**אלמנט:** \`<${a.tag}>\`${a.text ? ` — "${a.text}"` : ''}`,
        `**מיקום:** ${Math.round(a.top)}px מלמעלה, ${Math.round(a.left)}px משמאל`,
        `**מה לשנות:** ${a.description}`,
      ].join('\n')
    )
    return [
      '## בקשות שינוי — פני מנחם',
      `**דף:** ${typeof window !== 'undefined' ? window.location.href : ''}`,
      `**תאריך:** ${new Date().toLocaleDateString('he-IL')}`,
      '',
      ...parts,
    ].join('\n')
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatePrompt())
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <>
      {/* Transparent click-catcher when in selecting mode */}
      {mode === 'selecting' && (
        <div
          ref={overlayRef}
          onMouseMove={handleMouseMove}
          onClick={handleOverlayClick}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99997,
            cursor: 'crosshair',
            background: 'rgba(0,0,0,0.01)',
          }}
        />
      )}

      {/* Blue hover highlight */}
      {mode === 'selecting' && highlight && (
        <div
          style={{
            position: 'fixed',
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
            outline: '2px solid #6366f1',
            background: 'rgba(99,102,241,0.08)',
            pointerEvents: 'none',
            zIndex: 99998,
            transition: 'all 0.08s ease',
          }}
        />
      )}

      {/* Green pinned annotations on screen */}
      {annotations.map((a, i) => (
        <div
          key={a.id}
          style={{
            position: 'fixed',
            top: a.top,
            left: a.left,
            width: a.width,
            height: a.height,
            outline: '2px solid #10b981',
            background: 'rgba(16,185,129,0.06)',
            pointerEvents: 'none',
            zIndex: 99996,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: -20,
              right: 0,
              background: '#10b981',
              color: 'white',
              fontSize: 11,
              padding: '1px 6px',
              borderRadius: 3,
              fontFamily: 'system-ui',
            }}
          >
            #{i + 1}
          </span>
        </div>
      ))}

      {/* Main floating panel */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 99999,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          direction: 'rtl',
        }}
      >
        {mode === 'closed' ? (
          <button
            onClick={() => setMode('open')}
            title="עורך הערות (DEV)"
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: 22,
              boxShadow: '0 4px 16px rgba(99,102,241,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✏️
          </button>
        ) : (
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              width: 300,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                background: '#6366f1',
                color: 'white',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14 }}>✏️ עורך הערות — DEV</span>
              <button
                onClick={() => {
                  setMode('closed')
                  setAnnotations([])
                  setPending(null)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 20,
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 12 }}>
              {/* SELECTING: guidance message */}
              {mode === 'selecting' && (
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
                  <p style={{ fontSize: 13, color: '#4b5563', margin: '0 0 12px', lineHeight: 1.5 }}>
                    העבר עכבר על אלמנט ולחץ עליו כדי לסמן
                  </p>
                  <button
                    onClick={() => setMode('open')}
                    style={{
                      background: '#f3f4f6',
                      border: '1px solid #e5e7eb',
                      borderRadius: 6,
                      padding: '7px 18px',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    ביטול
                  </button>
                </div>
              )}

              {/* EDITING: describe the selected element */}
              {mode === 'editing' && pending && (
                <div>
                  <div
                    style={{
                      background: '#ede9fe',
                      borderRadius: 6,
                      padding: '7px 10px',
                      fontSize: 12,
                      color: '#4c1d95',
                      marginBottom: 10,
                    }}
                  >
                    נבחר:{' '}
                    <code
                      style={{
                        background: '#c4b5fd',
                        padding: '1px 4px',
                        borderRadius: 3,
                        fontSize: 11,
                      }}
                    >
                      &lt;{pending.tag}&gt;
                    </code>
                    {pending.text && (
                      <span style={{ color: '#5b21b6' }}>
                        {' '}— &quot;{pending.text.slice(0, 40)}
                        {pending.text.length > 40 ? '...' : ''}&quot;
                      </span>
                    )}
                  </div>

                  <textarea
                    placeholder="מה רוצה לשנות כאן?"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter' && e.metaKey) addAnnotation()
                    }}
                    style={{
                      width: '100%',
                      height: 85,
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      padding: 9,
                      fontSize: 13,
                      resize: 'none',
                      fontFamily: 'system-ui',
                      boxSizing: 'border-box',
                      direction: 'rtl',
                      outline: 'none',
                    }}
                  />

                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      onClick={addAnnotation}
                      disabled={!description.trim()}
                      style={{
                        flex: 1,
                        background: description.trim() ? '#6366f1' : '#e5e7eb',
                        color: description.trim() ? 'white' : '#9ca3af',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 0',
                        cursor: description.trim() ? 'pointer' : 'default',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      הוסף הערה ✓
                    </button>
                    <button
                      onClick={() => {
                        setPending(null)
                        setMode('open')
                      }}
                      style={{
                        background: '#f3f4f6',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 14px',
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      ביטול
                    </button>
                  </div>

                  <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', margin: '7px 0 0' }}>
                    ⌘+Enter לשמירה מהירה
                  </p>
                </div>
              )}

              {/* OPEN: list annotations and actions */}
              {mode === 'open' && (
                <div>
                  {annotations.length === 0 ? (
                    <p
                      style={{
                        color: '#9ca3af',
                        fontSize: 13,
                        textAlign: 'center',
                        margin: '8px 0 12px',
                      }}
                    >
                      לחץ למטה כדי לסמן אלמנטים
                    </p>
                  ) : (
                    <div
                      style={{
                        marginBottom: 10,
                        maxHeight: 200,
                        overflowY: 'auto',
                      }}
                    >
                      {annotations.map((a, i) => (
                        <div
                          key={a.id}
                          style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: 6,
                            padding: 8,
                            marginBottom: 6,
                            fontSize: 12,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                            }}
                          >
                            <div>
                              <span
                                style={{
                                  background: '#10b981',
                                  color: 'white',
                                  borderRadius: 3,
                                  padding: '1px 5px',
                                  fontSize: 11,
                                  marginLeft: 5,
                                }}
                              >
                                #{i + 1}
                              </span>
                              <code style={{ fontSize: 11, color: '#065f46' }}>
                                &lt;{a.tag}&gt;
                              </code>
                            </div>
                            <button
                              onClick={() =>
                                setAnnotations(prev => prev.filter(x => x.id !== a.id))
                              }
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#ef4444',
                                fontSize: 16,
                                padding: 0,
                                lineHeight: 1,
                              }}
                            >
                              ×
                            </button>
                          </div>
                          <p style={{ margin: '5px 0 0', color: '#374151', lineHeight: 1.4 }}>
                            {a.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setMode('selecting')}
                    style={{
                      width: '100%',
                      background: '#ede9fe',
                      color: '#6366f1',
                      border: '1px solid #c4b5fd',
                      borderRadius: 6,
                      padding: '9px 0',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 8,
                    }}
                  >
                    + סמן אלמנט על המסך
                  </button>

                  {annotations.length > 0 && (
                    <button
                      onClick={handleCopy}
                      style={{
                        width: '100%',
                        background: copied ? '#10b981' : '#1e1b4b',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        padding: '9px 0',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                        transition: 'background 0.2s',
                      }}
                    >
                      {copied ? '✓ הועתק לקליפבורד!' : '📋 העתק פרומפט לקלוד'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
