'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ShareCard } from '@/components/tracker/share-card'
import { DeepDive } from '@/components/tracker/deep-dive'
import { WeightsPanel } from '@/components/tracker/weights-panel'
import {
  CategoryScores,
  CategoryWeights,
  EventItem,
  ScoreHistoryPoint,
  computeCategoryScores,
  createDefaultWeights,
  weightedIndex,
} from '@/lib/democracy'

/** Client-only live clock text (prevents SSR/client mismatch) */
function useNowText() {
  const [text, setText] = React.useState('')
  const [iso, setIso] = React.useState('')
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setIso(d.toISOString())
      setText(d.toLocaleString())
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return { text, iso }
}

export default function DemocracyTracker() {
  // Start empty; seed on the client to avoid SSR timing drift
  const [events, setEvents] = useState<EventItem[]>([])
  const [weights, setWeights] = useState<CategoryWeights>(() => createDefaultWeights())
  const [history, setHistory] = useState<ScoreHistoryPoint[]>([])

  // Seed demo events on the client after mount (safe to use Date here)
  useEffect(() => {
    const seeds: EventItem[] = [
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
    setEvents(seeds)
  }, [])

  const categoryScores = useMemo<CategoryScores>(() => computeCategoryScores(events), [events])
  const index = useMemo(() => weightedIndex(categoryScores, weights), [categoryScores, weights])

  // Keep a small sparkline history (client-only)
  useEffect(() => {
    setHistory((prev) => [...prev.slice(-199), { ts: Date.now(), value: index }])
  }, [index])

  useEffect(() => {
    const timer = setInterval(() => {
      setHistory((prev) => [...prev.slice(-199), { ts: Date.now(), value: index }])
    }, 2000)
    return () => clearInterval(timer)
  }, [index])

  const cardRef = useRef<HTMLDivElement | null>(null)
  const { text: nowText, iso: nowISO } = useNowText()

  async function handleExport() {
    if (!cardRef.current) return
    const canvas = await html2canvas(cardRef.current, { backgroundColor: '#ffffff', scale: 2 })
    const link = document.createElement('a')
    link.download = `democracy-tracker-${new Date().toISOString().slice(0, 10)}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-2">
          <div className="text-lg font-semibold">U.S. Democracy Tracker</div>
          {/* Hydration-safe time display */}
          <div className="flex items-center gap-2 text-xs opacity-70">
            <time dateTime={nowISO} suppressHydrationWarning>
              {nowText || '—'}
            </time>
          </div>
          <Button onClick={handleExport} size="sm" className="shrink-0">
            <Download className="mr-2 h-4 w-4" />
            Export Card
          </Button>
        </div>
      </div>

      <section className="mx-auto max-w-4xl px-4 py-4">
        <div ref={cardRef} className="rounded-2xl border bg-white p-4 shadow-sm md:p-5">
          <ShareCard index={index} history={history} categoryScores={categoryScores} events={events} />
        </div>
      </section>

      <main className="mx-auto max-w-4xl space-y-6 px-4 pb-10">
        <DeepDive events={events} setEvents={setEvents} categoryScores={categoryScores} />
        <WeightsPanel weights={weights} setWeights={setWeights} />
      </main>
    </div>
  )
}
