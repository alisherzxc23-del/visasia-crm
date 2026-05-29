'use client'

import { useState } from 'react'

export default function LoginForm() {
  const [login, setLogin] = useState('director@visasia.kz')
  const [password, setPassword] = useState('123456')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Неверный логин или пароль')
      }
      window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#07101d] text-white flex items-center justify-center p-5">
      <form onSubmit={submit} className="w-full max-w-[420px] rounded-[28px] border border-[#26344b] bg-[#0e192b] p-8 shadow-2xl">
        <div className="mb-7">
          <div className="text-[28px] font-black tracking-[-0.04em]">VisAsia CRM</div>
          <div className="mt-2 text-sm text-[#93a4bd]">Вход для команды</div>
        </div>
        <label className="mb-4 block">
          <span className="mb-2 block text-xs font-bold text-[#9fb0ca]">Логин</span>
          <input value={login} onChange={e => setLogin(e.target.value)} className="h-12 w-full rounded-2xl border border-[#2a3951] bg-[#0a1322] px-4 text-white outline-none" />
        </label>
        <label className="mb-5 block">
          <span className="mb-2 block text-xs font-bold text-[#9fb0ca]">Пароль</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="h-12 w-full rounded-2xl border border-[#2a3951] bg-[#0a1322] px-4 text-white outline-none" />
        </label>
        {error && <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        <button disabled={loading} className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#f0d184] to-[#b9852f] font-black text-[#151006] disabled:opacity-60">
          {loading ? 'Вход...' : 'Войти'}
        </button>
        <div className="mt-5 text-xs leading-5 text-[#7f90aa]">
          Тест: director@visasia.kz / 123456<br />Менеджеры: dinara@visasia.kz, ruslan@visasia.kz, madina@visasia.kz / 123456
        </div>
      </form>
    </main>
  )
}
