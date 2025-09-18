'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowUpRight, ArrowDownRight, Download, RefreshCw } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import html2canvas from 'html2canvas'

/**
 * DEMOCRACY TRACKER — CARD + SCROLLABLE DEEP-DIVE
 * -------------------------------------------------
 * • Top: Shareable "infographic card" for social posts (no scroll needed)
 * • Below: Scrollable deep-dive with ledger, categories, weights, history
 * • Export button: saves the top card as a PNG for easy posting
 */

const CATEGORIES = [
  'Legislative',
  'Executive',
  'Judicial',
  'Elections',
  'Rights & Liberties',
  'Civil Society',
  'Political Violence',
] as const

type Category = typeof CATEGORIES[number]

export type EventItem = {
  id: string
  date: string // ISO
  title: string
  summary?: string
  url?: string
  category: Category
  direction: 1 | -1 // +1 = towards democracy, -1 = towards autocracy
  magnitude: number // 0.5..5 typical; can exceed
  confidence: number // 0..1
}

function computeCategoryScores(events: EventItem[], now = new Date()): Record<Category, number> {
  const halfLifeDays = 365
  const lambda = Math.log(2) / halfLifeDays

  // Properly typed zeroed map
  const base = CATEGORIES.reduce((acc, c) => {
    acc[c] = 0
    return acc
  }, {} as Record<Category, number>)

  for (const e of events) {
    const ageDays = Math.max(0, (now.getTime() - new Date(e.date).getTime()) / (1000 * 60 * 60 * 24))
    const decay = Math.exp(-lambda * ageDays)
    const signedImpact = e.direction * e.magnitude * e.confidence * decay
    base[e.category] += signedImpact
  }

  // No `any` here
  const norm: Record<Category, number> = { ...base }
  for (const k of CATEGORIES) {
    norm[k] = Math.tanh(base[k] / 10) * 100
  }
  return norm
}

function weightedIndex(categoryScores: Record<Category, number>, weights: Record<Category, number>) {
  const totalW = Object.values(weights).reduce((a, b) => a + b, 0) || 1
  const sum = (CATEGORIES as readonly Category[]).reduce((acc, c) => acc + categoryScores[c] * weights[c], 0)
  return sum / totalW
}

// --- Demo seed ---
const seedEvents: EventItem[] = [
  {
    id: 'seed-1',
    date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    title: 'Court curtails gerrymandered map',
    category: 'Elections',
    direction: 1,
    magnitude: 2.5,
    confidence: 0.9,
    url: '#',
  },
  {
    id: 'seed-2',
    date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    title: 'Legislature advances voter ID expansion',
    category: 'Elections',
    direction: -1,
    magnitude: 2.0,
    confidence: 0.8,
  },
  {
    id: 'seed-3',
    date: new Date().toISOString(),
    title: 'Peaceful mass protest for press freedom',
    category: 'Civil Society',
    direction: 1,
    magnitude: 1.2,
    confidence: 0.7,
  },
]

export default function DemocracyTracker() {
  const [events, setEvents] = useState<EventItem[]>(seedEvents)
  const [weights, setWeights] = useState<Record<Category, number>>(() =>
    Object.fromEntries(CATEGORIES.map(c => [c, 1])) as Record<Category, number>
  )
  const [history, setHistory] = useState<{ ts: number; value: number }[]>([])

  const categoryScores = useMemo(() => computeCategoryScores(events), [events])
  const index = useMemo(() => weightedIndex(categoryScores, weights), [categoryScores, weights])

  // Sparkline history (client-only)
  useEffect(() => {
    const t = setInterval(() => setHistory(h => [...h.slice(-199), { ts: Date.now(), value: index }]), 2000)
    return () => clearInterval(t)
  }, [index])

  // Export card as PNG
  const cardRef = useRef<HTMLDivElement | null>(null)
  async function handleExport() {
    if (!cardRef.current) return
    const canvas = await html2canvas(cardRef.current, { backgroundColor: '#ffffff', scale: 2 })
    const link = document.createElement('a')
    link.download = `democracy-tracker-${new Date().toISOString().slice(0,10)}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="min-h-screen bg-white">
      {/* TOP CARD (shareable, no scroll needed) */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-lg font-semibold">U.S. Democracy Tracker</div>
          <div className="flex items-center gap-2 text-xs opacity-70">{new Date().toLocaleString()}</div>
          <Button onClick={handleExport} size="sm" className="shrink-0"><Download className="w-4 h-4 mr-2"/>Export Card</Button>
        </div>
      </div>

      <section className="max-w-5xl mx-auto px-4 py-6">
        <div ref={cardRef} className="rounded-3xl border shadow-sm p-5 md:p-6 bg-white">
          <ShareCard index={index} history={history} categoryScores={categoryScores} events={events} />
        </div>
      </section>

      {/* SCROLLABLE DEEP-DIVE */}
      <main className="max-w-5xl mx-auto px-4 pb-16 space-y-8">
        <DeepDive events={events} setEvents={setEvents} categoryScores={categoryScores} />
        <WeightsPanel weights={weights} setWeights={setWeights} />
      </main>
    </div>
  )
}

function ShareCard({ index, history, categoryScores, events }: { index: number; history: {ts:number; value:number}[]; categoryScores: Record<Category, number>; events: EventItem[] }) {
  return (
    <div className="grid md:grid-cols-5 gap-6">
      {/* Left: Main bar + number */}
      <div className="md:col-span-3 space-y-3">
        <h1 className="text-2xl md:text-3xl font-bold">Today’s Index: {index.toFixed(1)}</h1>
        <div className="relative h-16 rounded-2xl bg-gray-100 overflow-hidden">
          <div className="absolute inset-0 flex"><div className="w-1/2 h-full bg-red-50"/><div className="w-1/2 h-full bg-green-50"/></div>
          <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300" />
          <motion.div className="absolute top-0 h-full w-1.5 bg-black rounded" initial={{ x: '50%' }} animate={{ x: `${50 + (index/2)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
          <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-medium"><span>-100 Autocracy</span><span>0</span><span>+100 Democracy</span></div>
        </div>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history.map(h => ({ t: new Date(h.ts).toLocaleTimeString(), v: h.value }))}>
              <XAxis dataKey="t" hide /><YAxis domain={[-100, 100]} hide />
              <Tooltip formatter={(v: unknown) => (typeof v === 'number' ? v.toFixed(1) : String(v))} />
              <Line type="monotone" dataKey="v" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Right: Category snapshot + top moves */}
      <div className="md:col-span-2 space-y-4">
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Category Snapshot</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(c => (
              <div key={c} className="text-sm">
                <div className="flex items-center justify-between">
                  <span className="opacity-70">{c}</span>
                  <span className="font-medium">{categoryScores[c].toFixed(0)}</span>
                </div>
                <div className="relative h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="absolute inset-0 flex"><div className="w-1/2 h-full bg-red-50"/><div className="w-1/2 h-full bg-green-50"/></div>
                  <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300" />
                  <motion.div className="absolute top-0 h-full bg-black" initial={{ x: '50%', width: '3%' }} animate={{ x: `${50 + (categoryScores[c]/2)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} style={{ width: '3%' }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Today’s Moves</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {events.slice(0,3).map(e => <EventRow key={e.id} e={e} />)}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DeepDive({ events, setEvents, categoryScores }: { events: EventItem[]; setEvents: React.Dispatch<React.SetStateAction<EventItem[]>>; categoryScores: Record<Category, number> }) {
  // Quick add form
  const [qa, setQa] = useState<Partial<EventItem>>({ title: '', category: 'Legislative', direction: 1, magnitude: 1.0, confidence: 0.8 })
  const [importText, setImportText] = useState('')

  function addEvent(e: Partial<EventItem>) {
    const item: EventItem = {
      id: `evt-${crypto.randomUUID()}`,
      date: new Date().toISOString(),
      title: e.title || 'Untitled Event',
      category: (e.category as Category) || 'Legislative',
      direction: (e.direction as 1 | -1) ?? 1,
      magnitude: Number(e.magnitude ?? 1),
      confidence: Number(e.confidence ?? 0.8),
      url: e.url,
    }
    setEvents(prev => [item, ...prev])
  }

  function mergeEvents(prev: EventItem[], incoming: EventItem[]) {
    const map = new Map(prev.map(x => [x.id, x]))
    for (const e of incoming) map.set(e.id, e)
    return Array.from(map.values()).sort((a, b) => +new Date(b.date) - +new Date(a.date))
  }

  function handleImport() {
    try {
      const arr = JSON.parse(importText)
      if (Array.isArray(arr)) setEvents(prev => mergeEvents(prev, arr))
      setImportText('')
    } catch {
      alert('Invalid JSON. Expect an array of EventItem objects.')
    }
  }

  return (
    <div className="space-y-8">
      {/* Category Gauges */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Category Gauges</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {CATEGORIES.map((c) => (
            <Card key={c}>
              <CardHeader className="py-3"><CardTitle className="text-base">{c}</CardTitle></CardHeader>
              <CardContent><Gauge value={categoryScores[c]} /></CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Ledger */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Event Ledger</h2>
        <div className="space-y-3">
          {events.map(e => <EventRow key={e.id} e={e} detailed />)}
        </div>
      </section>

      {/* Add / Import */}
      <section className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="py-3"><CardTitle>Add Event (Quick)</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-sm">Title</label>
              <Input value={qa.title as string} onChange={e => setQa({ ...qa, title: e.target.value })} placeholder="e.g., Court blocks voter suppression bill" />
            </div>
            <div>
              <label className="text-sm">Category</label>
              <select className="w-full border rounded-md h-10 px-2" value={qa.category as string} onChange={e => setQa({ ...qa, category: e.target.value as Category })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm">Direction</label>
              <select className="w-full border rounded-md h-10 px-2" value={qa.direction as number} onChange={e => setQa({ ...qa, direction: Number(e.target.value) as 1 | -1 })}>
                <option value={1}>Towards Democracy (+)</option>
                <option value={-1}>Towards Autocracy (-)</option>
              </select>
            </div>
            <div>
              <label className="text-sm">Magnitude</label>
              <Input type="number" step="0.1" value={qa.magnitude as number} onChange={e => setQa({ ...qa, magnitude: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-sm">Confidence</label>
              <Input type="number" step="0.05" value={qa.confidence as number} onChange={e => setQa({ ...qa, confidence: Number(e.target.value) })} />
            </div>
            <Button className="md:col-span-1" onClick={() => addEvent(qa)}>Add</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3"><CardTitle>Import Events (JSON)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Textarea rows={8} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={exampleJSON} />
            <div className="flex gap-2">
              <Button onClick={handleImport}><RefreshCw className="w-4 h-4 mr-2"/>Import</Button>
              <Button variant="secondary" onClick={() => setImportText(exampleJSON)}>Load Example</Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function WeightsPanel({ weights, setWeights }: { weights: Record<Category, number>; setWeights: React.Dispatch<React.SetStateAction<Record<Category, number>>> }) {
  return (
    <Card>
      <CardHeader className="py-3"><CardTitle>Category Weights</CardTitle></CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        {CATEGORIES.map((c) => (
          <div key={c} className="p-3 rounded-xl bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{c}</span>
              <span className="text-sm opacity-70">{weights[c].toFixed(2)}</span>
            </div>
            <Slider value={[weights[c]]} min={0} max={3} step={0.05} onValueChange={(v) => setWeights(w => ({ ...w, [c]: v[0] }))} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function Gauge({ value }: { value: number }) {
  return (
    <div className="space-y-2">
      <div className="text-2xl font-semibold">{value.toFixed(1)}</div>
      <div className="relative h-3 rounded-full bg-gray-100 overflow-hidden">
        <div className="absolute inset-0 flex"><div className="w-1/2 h-full bg-red-50" /><div className="w-1/2 h-full bg-green-50" /></div>
        <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300" />
        <motion.div className="absolute top-0 h-full bg-black" initial={{ x: '50%', width: '2%' }} animate={{ x: `${50 + (value/2)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} style={{ width: '2%' }} />
      </div>
    </div>
  )
}

function EventRow({ e, detailed = false }: { e: EventItem; detailed?: boolean }) {
  const Icon = e.direction === 1 ? ArrowUpRight : ArrowDownRight
  return (
    <div className={`p-3 rounded-xl border ${e.direction===1 ? 'bg-green-50/40 border-green-200' : 'bg-red-50/40 border-red-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium truncate">{e.title}</div>
          <div className="text-xs opacity-70">{new Date(e.date).toLocaleString()} · {e.category}</div>
          {detailed && e.summary && <div className="text-sm mt-1">{e.summary}</div>}
          {detailed && e.url && <a className="text-sm underline" href={e.url} target="_blank" rel="noreferrer">Source</a>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${e.direction===1 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
            <Icon className="w-3 h-3" />
            {e.direction===1 ? '+ ' : '- '}{e.magnitude.toFixed(1)} · conf {Math.round(e.confidence*100)}%
          </div>
        </div>
      </div>
    </div>
  )
}

const exampleJSON = `[
  {"id":"ext-001","date":"${new Date().toISOString()}","title":"Independent commission adopts fair maps","category":"Elections","direction":1,"magnitude":3.0,"confidence":0.9,"url":"https://example.com/source"},
  {"id":"ext-002","date":"${new Date().toISOString()}","title":"Court stays injunction; restrictive law reinstated","category":"Rights & Liberties","direction":-1,"magnitude":2.0,"confidence":0.85}
]`

