'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

type CurrentUser = {
  id: number
  name: string
  login: string
  role: string
  telegramId?: string | null
}

type CrmBootstrapData = {
  clients: unknown
  stages: unknown
  managers: unknown
  tasks: unknown
  payments: unknown
  plans: unknown
  currentUser: CurrentUser
}

async function safeJsonFetch(path: string) {
  const res = await fetch(path, { cache: 'no-store' })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { error: text.slice(0, 200) }
  }
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  return data
}

export default function CRM({ currentUser }: { currentUser: CurrentUser }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const fetchStartedRef = useRef(false)
  const dataSentRef = useRef(false)
  const currentUserRef = useRef(currentUser)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [bootstrapData, setBootstrapData] = useState<CrmBootstrapData | null>(null)

  useEffect(() => {
    currentUserRef.current = currentUser
  }, [currentUser])

  const sendBootstrapData = useCallback((data: CrmBootstrapData | null = bootstrapData) => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow || !data || dataSentRef.current) return
    dataSentRef.current = true
    iframe.contentWindow.postMessage({ type: 'VISASIA_DATA', payload: data }, window.location.origin)
  }, [bootstrapData])

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      const data = event.data || {}
      if (data.type !== 'VISASIA_API') return
      const { requestId, path, method, body } = data
      fetch(path, {
        method: method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
        .then(async (res) => {
          const json = await res.json().catch(() => null)
          iframeRef.current?.contentWindow?.postMessage({ type: 'VISASIA_API_RESULT', requestId, ok: res.ok, status: res.status, data: json }, window.location.origin)
        })
        .catch((error) => {
          iframeRef.current?.contentWindow?.postMessage({ type: 'VISASIA_API_RESULT', requestId, ok: false, status: 0, error: String(error) }, window.location.origin)
        })
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    if (fetchStartedRef.current) return
    fetchStartedRef.current = true
    Promise.all([
      safeJsonFetch('/api/clients'),
      safeJsonFetch('/api/stages'),
      safeJsonFetch('/api/managers'),
      safeJsonFetch('/api/tasks'),
      safeJsonFetch('/api/payments'),
      safeJsonFetch('/api/plans'),
    ]).then(([clients, stages, managers, tasks, payments, plans]) => {
      setBootstrapData({ clients, stages, managers, tasks, payments, plans, currentUser: currentUserRef.current })
    }).catch((error) => {
      setLoadError(String(error?.message || error))
    })
  }, [])

  useEffect(() => {
    sendBootstrapData(bootstrapData)
  }, [bootstrapData, sendBootstrapData])

  if (loadError) return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0b1020', color: '#fff', fontFamily: 'Inter, Arial', padding: 24 }}>
      <div style={{ maxWidth: 560, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 24, padding: 28 }}>
        <h1 style={{ fontSize: 22, marginBottom: 10 }}>CRM не получила данные из API</h1>
        <p style={{ opacity: .78, marginBottom: 16 }}>Проверь терминал, где запущен npm run dev. Обычно нужно один раз выполнить npm run db:seed, затем перезапустить npm run dev.</p>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, background: 'rgba(0,0,0,.25)', padding: 12, borderRadius: 12 }}>{loadError}</pre>
      </div>
    </div>
  )

  return (
    <iframe
      ref={iframeRef}
      src="/crm.html"
      onLoad={() => sendBootstrapData(bootstrapData)}
      style={{ width: '100%', height: '100vh', border: 'none' }}
    />
  )
}
